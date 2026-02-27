/**
 * AppContext — Supabase-backed state management.
 * 
 * Replaces the old localStorage/mock data approach with real Supabase queries.
 */
import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@backend/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fromDbStatus, fromDbPriority, toDbStatus, toDbPriority } from "@backend/lib/statusMapping";
import type { Task, Unit, Vendor, Property, ReportedIssue, ChecklistItem, ReworkItem, TaskSubmission, UnitDocument } from "@backend/types";
import type { ParsedUnit } from "@/lib/rentRollParser";
import type { Json } from "@backend/integrations/supabase/types";

// ─── Context shape ──────────────────────────────────────────────

interface AppState {
  tasks: Record<string, Task>;
  units: Record<string, Unit>;
  properties: Record<string, Property>;
  vendors: Record<string, Vendor>;
  loading: boolean;
  // Task actions
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  addPhoto: (taskId: string, photoUrl: string) => void;
  addIssue: (taskId: string, issue: ReportedIssue) => void;
  completeTask: (taskId: string, options?: { geoLat?: number; geoLng?: number }) => void;
  getProgress: (taskId: string) => number;
  createTask: (task: Task) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  requestRework: (taskId: string, reworkItems: ReworkItem[], reworkNote?: string) => Promise<void>;
  // Property actions (PM)
  createProperty: (name: string, address?: string) => Promise<void>;
  updateProperty: (propertyId: string, updates: Partial<Property>) => Promise<void>;
  deleteProperty: (propertyId: string) => Promise<void>;
  // Unit actions
  createUnit: (propertyId: string, unitNumber: string) => Promise<void>;
  updateUnit: (unitId: string, updates: Partial<Unit>) => Promise<void>;
  deleteUnit: (unitId: string) => Promise<void>;
  bulkUpsertUnits: (propertyId: string, parsedUnits: ParsedUnit[]) => Promise<void>;
  // Unit document actions
  fetchUnitDocuments: (unitId: string) => Promise<UnitDocument[]>;
  addUnitDocument: (unitId: string, fileUrl: string, fileName: string, fileType: string) => Promise<UnitDocument>;
  deleteUnitDocument: (docId: string) => Promise<void>;
  // Vendor actions
  createVendor: (vendor: Vendor) => Promise<void>;
  updateVendor: (vendorId: string, updates: Partial<Vendor>) => Promise<void>;
  deleteVendor: (vendorId: string) => Promise<void>;
  // Refresh
  refresh: () => void;
}

const AppContext = createContext<AppState | null>(null);

export const useAppState = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppState must be used within AppProvider");
  return ctx;
};

export const useTaskState = useAppState;

// ─── Helpers ────────────────────────────────────────────────────

function parseChecklist(raw: Json | null): ChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item: any) => ({
    id: item.id ?? "",
    label: item.label ?? "",
    checked: !!item.checked,
  }));
}

function parseSpecs(raw: Json | null): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s: any) => String(s));
}

function parseReworkItems(raw: Json | null): ReworkItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((r: any) => ({
    checklistItemId: r.checklistItemId ?? "",
    note: r.note ?? "",
  }));
}

// ─── Provider ───────────────────────────────────────────────────

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user, role } = useAuth();
  const [tasks, setTasks] = useState<Record<string, Task>>({});
  const [units, setUnits] = useState<Record<string, Unit>>({});
  const [properties, setProperties] = useState<Record<string, Property>>({});
  const [vendors, setVendors] = useState<Record<string, Vendor>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setTasks({});
      setUnits({});
      setProperties({});
      setVendors({});
      setLoading(false);
      return;
    }

    // Wait for role so vendor path runs link_vendor_profile_by_email before fetching tasks
    if (role === null) {
      setLoading(true);
      return;
    }

    setLoading(true);

    // Ensure current user has a profile (required for properties.pm_id FK)
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: (user.user_metadata as Record<string, unknown>)?.full_name ?? "",
        email: user.email ?? "",
      },
      { onConflict: "id" }
    );

    // Link PM-created vendor rows to this user by email when there’s a match (works for
    // both existing users on login and new users after signup). Pass email for hosted Supabase.
    await supabase.rpc("link_vendor_profile_by_email", {
      p_user_email: user.email ?? undefined,
    });

    // Fetch tasks
    const { data: dbTasks } = await supabase
      .from("tasks")
      .select("*");

    // Fetch submissions for all tasks
    const taskIds = (dbTasks ?? []).map(t => t.id);
    let dbSubmissions: any[] = [];
    if (taskIds.length > 0) {
      const { data } = await supabase
        .from("task_submissions")
        .select("*")
        .in("task_id", taskIds)
        .order("submitted_at", { ascending: true });
      dbSubmissions = data ?? [];
    }

    // Fetch issues
    let dbIssues: any[] = [];
    if (taskIds.length > 0) {
      const { data } = await supabase
        .from("reported_issues")
        .select("*")
        .in("task_id", taskIds);
      dbIssues = data ?? [];
    }

    // Group submissions and issues by task
    const submissionsByTask: Record<string, TaskSubmission[]> = {};
    dbSubmissions.forEach(s => {
      if (!submissionsByTask[s.task_id]) submissionsByTask[s.task_id] = [];
      submissionsByTask[s.task_id].push({
        checklist: parseChecklist(s.checklist_snapshot),
        photos: s.photos ?? [],
        submittedAt: s.submitted_at,
        reworkItems: parseReworkItems(s.rework_items),
        reworkNote: s.rework_note ?? undefined,
        geoLat: s.geo_lat ?? undefined,
        geoLng: s.geo_lng ?? undefined,
      });
    });

    const issuesByTask: Record<string, ReportedIssue[]> = {};
    dbIssues.forEach(i => {
      if (!issuesByTask[i.task_id]) issuesByTask[i.task_id] = [];
      issuesByTask[i.task_id].push({
        id: i.id,
        title: i.title,
        description: i.description ?? "",
        photoUrl: i.photo_url ?? undefined,
        status: "Reported",
      });
    });

    // Fetch PM profile names so vendor can see who assigned the task
    const pmIds = [...new Set((dbTasks ?? []).map(t => t.pm_id))];
    const pmNamesMap: Record<string, string> = {};
    if (pmIds.length > 0) {
      const { data: pmProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", pmIds);
      (pmProfiles ?? []).forEach((p: { id: string; full_name: string | null }) => {
        pmNamesMap[p.id] = p.full_name ?? "";
      });
    }

    const tasksMap: Record<string, Task> = {};
    (dbTasks ?? []).forEach(t => {
      tasksMap[t.id] = {
        id: t.id,
        unitId: t.unit_id,
        vendorId: t.vendor_id,
        pmId: t.pm_id,
        pmName: pmNamesMap[t.pm_id] || undefined,
        name: t.name,
        description: t.description ?? "",
        status: fromDbStatus(t.status),
        priority: fromDbPriority(t.priority),
        estimatedDuration: t.estimated_duration ?? "",
        dueDate: t.due_date ?? "",
        checklist: parseChecklist(t.checklist),
        specifications: parseSpecs(t.specifications),
        photos: t.photos ?? [],
        issues: issuesByTask[t.id] ?? [],
        reworkNote: t.rework_note ?? undefined,
        reworkItems: parseReworkItems(t.rework_items),
        submissionHistory: submissionsByTask[t.id],
      };
    });
    setTasks(tasksMap);

    // Fetch properties (PM only)
    let propertiesMap: Record<string, Property> = {};
    if (role === "pm") {
      const { data: dbProperties } = await supabase.from("properties").select("*");
      (dbProperties ?? []).forEach((p: any) => {
        propertiesMap[p.id] = {
          id: p.id,
          name: p.name,
          address: p.address ?? "",
        };
      });
      setProperties(propertiesMap);
    }

    // Fetch units + property denormalized (name, address)
    const { data: dbUnits } = await supabase.from("units").select("*, properties(name, address)");
    const unitsMap: Record<string, Unit> = {};
    (dbUnits ?? []).forEach((u: any) => {
      const unitTaskIds = (dbTasks ?? []).filter(t => t.unit_id === u.id).map(t => t.id);
      unitsMap[u.id] = {
        id: u.id,
        propertyId: u.property_id,
        unitNumber: u.unit_number,
        propertyName: u.properties?.name ?? "",
        address: u.properties?.address ?? "",
        turnoverStatus: "",
        taskIds: unitTaskIds,
        unitType: u.unit_type ?? undefined,
        sqFt: u.sq_ft ?? undefined,
        tenantName: u.tenant_name ?? undefined,
        leaseStart: u.lease_start ?? undefined,
        leaseEnd: u.lease_end ?? undefined,
        leaseTermMonths: u.lease_term_months ?? undefined,
        moveInDate: u.move_in_date ?? undefined,
        securityDeposit: u.security_deposit != null ? Number(u.security_deposit) : undefined,
        monthlyRent: u.monthly_rent != null ? Number(u.monthly_rent) : undefined,
        lastIncrease: u.last_increase != null ? Number(u.last_increase) : undefined,
        concession: u.concession != null ? Number(u.concession) : undefined,
        parking: u.parking != null ? Number(u.parking) : undefined,
        lateFee: u.late_fee != null ? Number(u.late_fee) : undefined,
        otherFee: u.other_fee != null ? Number(u.other_fee) : undefined,
        marketRent: u.market_rent != null ? Number(u.market_rent) : undefined,
        leaseStatus: u.lease_status ?? undefined,
        occupants: u.occupants ?? undefined,
        petRent: u.pet_rent != null ? Number(u.pet_rent) : undefined,
        arrears: u.arrears != null ? Number(u.arrears) : undefined,
        moveInSpecials: u.move_in_specials ?? undefined,
        subsidizedRent: u.subsidized_rent != null ? Number(u.subsidized_rent) : undefined,
        lastPaidDate: u.last_paid_date ?? undefined,
        utilityBillbacks: u.utility_billbacks != null ? Number(u.utility_billbacks) : undefined,
        leaseBreakFee: u.lease_break_fee != null ? Number(u.lease_break_fee) : undefined,
        annualRent: u.annual_rent != null ? Number(u.annual_rent) : undefined,
        notes: u.notes ?? undefined,
      };
    });
    setUnits(unitsMap);

    // Fetch vendors (from vendors table for PM)
    if (role === "pm") {
      const { data: dbVendors } = await supabase.from("vendors").select("*").eq("pm_id", user!.id);
      const vendorsMap: Record<string, Vendor> = {};
      (dbVendors ?? []).forEach((v: { id: string; name: string; email: string | null; phone: string | null; specialty: string | null }) => {
        vendorsMap[v.id] = {
          id: v.id,
          name: v.name,
          email: v.email ?? "",
          phone: v.phone ?? "",
          specialty: v.specialty ?? "Cleaning",
        };
      });
      setVendors(vendorsMap);
    } else {
      setVendors({});
    }

    setLoading(false);
  }, [user, role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Task actions ──

  const toggleChecklistItem = useCallback(async (taskId: string, itemId: string) => {
    setTasks(prev => {
      const task = prev[taskId];
      if (!task) return prev;
      const checklist = task.checklist.map(c =>
        c.id === itemId ? { ...c, checked: !c.checked } : c
      );
      const status = task.status === "Not Started" ? "In Progress" as const : task.status;
      const updated = { ...task, checklist, status };
      // Persist to DB
      supabase.from("tasks").update({
        checklist: checklist as unknown as Json,
        status: toDbStatus(status) as any,
      }).eq("id", taskId).then();
      return { ...prev, [taskId]: updated };
    });
  }, []);

  const addPhoto = useCallback(async (taskId: string, photoUrl: string) => {
    setTasks(prev => {
      const task = prev[taskId];
      if (!task) return prev;
      const photos = [...task.photos, photoUrl];
      supabase.from("tasks").update({ photos }).eq("id", taskId).then();
      return { ...prev, [taskId]: { ...task, photos } };
    });
  }, []);

  const addIssue = useCallback(async (taskId: string, issue: ReportedIssue) => {
    // Insert into reported_issues table
    await supabase.from("reported_issues").insert({
      task_id: taskId,
      title: issue.title,
      description: issue.description || null,
      photo_url: issue.photoUrl || null,
    });
    setTasks(prev => {
      const task = prev[taskId];
      if (!task) return prev;
      return { ...prev, [taskId]: { ...task, issues: [...task.issues, issue] } };
    });
  }, []);

  const completeTask = useCallback(async (taskId: string, options?: { geoLat?: number; geoLng?: number }) => {
    const task = tasks[taskId];
    if (!task) return;

    const { error: subErr } = await supabase.from("task_submissions").insert({
      task_id: taskId,
      checklist_snapshot: task.checklist as unknown as Json,
      photos: task.photos,
      geo_lat: options?.geoLat ?? null,
      geo_lng: options?.geoLng ?? null,
    });
    if (subErr) throw subErr;

    const { error: taskErr } = await supabase.from("tasks").update({
      status: "completed",
      photos: [],
    }).eq("id", taskId);
    if (taskErr) throw taskErr;

    const submission: TaskSubmission = {
      checklist: task.checklist,
      photos: task.photos,
      submittedAt: new Date().toISOString(),
      geoLat: options?.geoLat,
      geoLng: options?.geoLng,
    };
    setTasks(prev => {
      const t = prev[taskId];
      if (!t) return prev;
      return {
        ...prev,
        [taskId]: {
          ...t,
          status: "Completed",
          photos: [],
          submissionHistory: [...(t.submissionHistory ?? []), submission],
        },
      };
    });
  }, [tasks]);

  const getProgress = useCallback((taskId: string) => {
    const task = tasks[taskId];
    if (!task || task.checklist.length === 0) return 0;
    const checked = task.checklist.filter(c => c.checked).length;
    return Math.round((checked / task.checklist.length) * 100);
  }, [tasks]);

  const createTask = useCallback(async (task: Task) => {
    const { data, error } = await supabase.from("tasks").insert({
      unit_id: task.unitId,
      vendor_id: task.vendorId,
      pm_id: user!.id,
      name: task.name,
      description: task.description || null,
      status: toDbStatus(task.status) as any,
      priority: toDbPriority(task.priority) as any,
      estimated_duration: task.estimatedDuration || null,
      due_date: task.dueDate || null,
      checklist: task.checklist as unknown as Json,
      specifications: task.specifications as unknown as Json,
    }).select().single();

    if (error) throw error;
    if (!data) return;

    const newTask: Task = {
      ...task,
      id: data.id,
      issues: task.issues ?? [],
      submissionHistory: task.submissionHistory ?? [],
    };
    setTasks(prev => ({ ...prev, [data.id]: newTask }));
    setUnits(prev => {
      const unit = prev[task.unitId];
      if (!unit) return prev;
      return { ...prev, [task.unitId]: { ...unit, taskIds: [...(unit.taskIds ?? []), data.id] } };
    });
  }, [user]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const dbUpdates: Record<string, any> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.status !== undefined) dbUpdates.status = toDbStatus(updates.status) as any;
    if (updates.priority !== undefined) dbUpdates.priority = toDbPriority(updates.priority) as any;
    if (updates.estimatedDuration !== undefined) dbUpdates.estimated_duration = updates.estimatedDuration;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.checklist !== undefined) dbUpdates.checklist = updates.checklist as unknown as Json;
    if (updates.specifications !== undefined) dbUpdates.specifications = updates.specifications as unknown as Json;
    if (updates.photos !== undefined) dbUpdates.photos = updates.photos;
    if (updates.reworkNote !== undefined) dbUpdates.rework_note = updates.reworkNote;
    if (updates.reworkItems !== undefined) dbUpdates.rework_items = updates.reworkItems as unknown as Json;
    if (updates.vendorId !== undefined) dbUpdates.vendor_id = updates.vendorId;
    if (updates.unitId !== undefined) dbUpdates.unit_id = updates.unitId;

    const { error } = await supabase.from("tasks").update(dbUpdates).eq("id", taskId);
    if (error) throw error;
    setTasks(prev => {
      const task = prev[taskId];
      if (!task) return prev;
      return { ...prev, [taskId]: { ...task, ...updates } };
    });
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) throw error;
    setTasks(prev => {
      const next = { ...prev };
      const task = next[taskId];
      delete next[taskId];
      return next;
    });
    setUnits(prev => {
      const updated = { ...prev };
      for (const uid of Object.keys(updated)) {
        updated[uid] = {
          ...updated[uid],
          taskIds: updated[uid].taskIds.filter(id => id !== taskId),
        };
      }
      return updated;
    });
  }, []);

  const requestRework = useCallback(async (taskId: string, reworkItems: ReworkItem[], reworkNote?: string) => {
    const task = tasks[taskId];
    if (!task) return;

    const { error: subErr } = await supabase.from("task_submissions").insert({
      task_id: taskId,
      checklist_snapshot: task.checklist as unknown as Json,
      photos: task.photos,
      rework_items: reworkItems as unknown as Json,
      rework_note: reworkNote ?? null,
    });
    if (subErr) throw subErr;

    const flaggedIds = new Set(reworkItems.map(r => r.checklistItemId));
    const checklist = task.checklist.map(c =>
      flaggedIds.has(c.id) ? { ...c, checked: false } : c
    );

    const { error: taskErr } = await supabase.from("tasks").update({
      status: "rework",
      rework_note: reworkNote ?? null,
      rework_items: reworkItems as unknown as Json,
      checklist: checklist as unknown as Json,
      photos: [],
    }).eq("id", taskId);
    if (taskErr) throw taskErr;

    const submission: TaskSubmission = {
      checklist: [...task.checklist],
      photos: [...task.photos],
      submittedAt: new Date().toISOString(),
      reworkItems,
      reworkNote,
    };
    setTasks(prev => {
      const t = prev[taskId];
      if (!t) return prev;
      return {
        ...prev,
        [taskId]: {
          ...t,
          status: "Rework",
          reworkNote,
          reworkItems,
          checklist,
          photos: [],
          submissionHistory: [...(t.submissionHistory ?? []), submission],
        },
      };
    });
  }, [tasks]);

  // ── Property actions (PM) ──

  const createProperty = useCallback(async (name: string, address?: string) => {
    if (!user) return;
    // Ensure profile exists so pm_id FK is satisfied
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        full_name: (user.user_metadata as Record<string, unknown>)?.full_name ?? "",
        email: user.email ?? "",
      },
      { onConflict: "id" }
    );
    const { data, error } = await supabase
      .from("properties")
      .insert({ pm_id: user.id, name, address: address ?? null })
      .select()
      .single();
    if (error) throw error;
    if (data) {
      setProperties(prev => ({
        ...prev,
        [data.id]: { id: data.id, name: data.name, address: data.address ?? "" },
      }));
    }
  }, [user]);

  const updateProperty = useCallback(async (propertyId: string, updates: Partial<Property>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (Object.keys(dbUpdates).length === 0) return;
    const { error } = await supabase.from("properties").update(dbUpdates).eq("id", propertyId);
    if (error) throw error;
    setProperties(prev => {
      const p = prev[propertyId];
      if (!p) return prev;
      return { ...prev, [propertyId]: { ...p, ...updates } };
    });
    // Update denormalized name/address on all units of this property
    setUnits(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(uid => {
        const u = next[uid];
        if (u.propertyId !== propertyId) return;
        next[uid] = {
          ...u,
          propertyName: updates.name ?? u.propertyName,
          address: updates.address ?? u.address,
        };
      });
      return next;
    });
  }, []);

  const deleteProperty = useCallback(async (propertyId: string) => {
    const propertyUnits = Object.values(units).filter(u => u.propertyId === propertyId);
    const hasTasks = propertyUnits.some(u => (u.taskIds?.length ?? 0) > 0);
    if (hasTasks) return; // caller should block or show error
    const { error: delErr } = await supabase.from("properties").delete().eq("id", propertyId);
    if (delErr) throw delErr;
    setProperties(prev => {
      const next = { ...prev };
      delete next[propertyId];
      return next;
    });
    setUnits(prev => {
      const next = { ...prev };
      propertyUnits.forEach(u => delete next[u.id]);
      return next;
    });
  }, [units]);

  // ── Unit actions ──

  const createUnit = useCallback(async (propertyId: string, unitNumber: string) => {
    const { data, error } = await supabase
      .from("units")
      .insert({ property_id: propertyId, unit_number: unitNumber.trim() })
      .select()
      .single();
    if (error) throw error;
    if (data) {
      const prop = properties[propertyId];
      setUnits(prev => ({
        ...prev,
        [data.id]: {
          id: data.id,
          propertyId: data.property_id,
          unitNumber: data.unit_number,
          propertyName: prop?.name ?? "",
          address: prop?.address ?? "",
          turnoverStatus: "",
          taskIds: [],
        },
      }));
    }
  }, [properties]);

  const updateUnit = useCallback(async (unitId: string, updates: Partial<Unit>) => {
    const unit = units[unitId];
    if (!unit) return;
    const dbUpdates: Record<string, unknown> = {};
    if (updates.unitNumber !== undefined) dbUpdates.unit_number = updates.unitNumber;
    if (updates.propertyId !== undefined) dbUpdates.property_id = updates.propertyId;
    if (Object.keys(dbUpdates).length > 0) {
      const { error: updErr } = await supabase.from("units").update(dbUpdates).eq("id", unitId);
      if (updErr) throw updErr;
    }
    const prop = updates.propertyId ? properties[updates.propertyId] : undefined;
    setUnits(prev => {
      const u = prev[unitId];
      if (!u) return prev;
      return {
        ...prev,
        [unitId]: {
          ...u,
          ...updates,
          propertyName: prop ? prop.name : u.propertyName,
          address: prop ? prop.address : u.address,
        },
      };
    });
  }, [units, properties]);

  const deleteUnit = useCallback(async (unitId: string) => {
    const unit = units[unitId];
    if (!unit || (unit.taskIds?.length ?? 0) > 0) return; // caller should block if has tasks
    const { error } = await supabase.from("units").delete().eq("id", unitId);
    if (error) throw error;
    setUnits(prev => {
      const next = { ...prev };
      delete next[unitId];
      return next;
    });
  }, [units]);

  const bulkUpsertUnits = useCallback(async (propertyId: string, parsedUnits: ParsedUnit[]) => {
    const prop = properties[propertyId];
    const existingUnits = Object.values(units).filter(u => u.propertyId === propertyId);
    const existingByNumber: Record<string, Unit> = {};
    existingUnits.forEach(u => { existingByNumber[u.unitNumber] = u; });

    for (const pu of parsedUnits) {
      const row: Record<string, unknown> = {
        property_id: propertyId,
        unit_number: pu.unitNumber,
        unit_type: pu.unitType ?? null,
        sq_ft: pu.sqFt ?? null,
        tenant_name: pu.tenantName ?? null,
        lease_start: pu.leaseStart ?? null,
        lease_end: pu.leaseEnd ?? null,
        lease_term_months: pu.leaseTermMonths ?? null,
        move_in_date: pu.moveInDate ?? null,
        security_deposit: pu.securityDeposit ?? null,
        monthly_rent: pu.monthlyRent ?? null,
        market_rent: pu.marketRent ?? null,
        last_increase: pu.lastIncrease ?? null,
        concession: pu.concession ?? null,
        parking: pu.parking ?? null,
        late_fee: pu.lateFee ?? null,
        other_fee: pu.otherFee ?? null,
        lease_status: pu.leaseStatus ?? null,
        occupants: pu.occupants ?? null,
        pet_rent: pu.petRent ?? null,
        arrears: pu.arrears ?? null,
        move_in_specials: pu.moveInSpecials ?? null,
        subsidized_rent: pu.subsidizedRent ?? null,
        last_paid_date: pu.lastPaidDate ?? null,
        utility_billbacks: pu.utilityBillbacks ?? null,
        lease_break_fee: pu.leaseBreakFee ?? null,
        annual_rent: pu.annualRent ?? null,
        notes: pu.notes ?? null,
      };

      const existing = existingByNumber[pu.unitNumber];
      if (existing) {
        const { error } = await supabase.from("units").update(row).eq("id", existing.id);
        if (error) throw error;
        setUnits(prev => ({
          ...prev,
          [existing.id]: {
            ...prev[existing.id],
            ...pu,
            propertyName: prop?.name ?? "",
            address: prop?.address ?? "",
          },
        }));
      } else {
        const { data, error } = await supabase.from("units").insert(row).select().single();
        if (error) throw error;
        if (data) {
          setUnits(prev => ({
            ...prev,
            [data.id]: {
              id: data.id,
              propertyId,
              unitNumber: pu.unitNumber,
              propertyName: prop?.name ?? "",
              address: prop?.address ?? "",
              turnoverStatus: "",
              taskIds: [],
              ...pu,
            },
          }));
        }
      }
    }
  }, [properties, units]);

  // ── Unit document actions ──

  const fetchUnitDocuments = useCallback(async (unitId: string): Promise<UnitDocument[]> => {
    const { data, error } = await supabase
      .from("unit_documents")
      .select("*")
      .eq("unit_id", unitId)
      .order("uploaded_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((d: any) => ({
      id: d.id,
      unitId: d.unit_id,
      fileUrl: d.file_url,
      fileName: d.file_name,
      fileType: d.file_type,
      uploadedAt: d.uploaded_at,
    }));
  }, []);

  const addUnitDocument = useCallback(async (
    unitId: string, fileUrl: string, fileName: string, fileType: string
  ): Promise<UnitDocument> => {
    const { data, error } = await supabase
      .from("unit_documents")
      .insert({ unit_id: unitId, file_url: fileUrl, file_name: fileName, file_type: fileType })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      unitId: data.unit_id,
      fileUrl: data.file_url,
      fileName: data.file_name,
      fileType: data.file_type,
      uploadedAt: data.uploaded_at,
    };
  }, []);

  const deleteUnitDocument = useCallback(async (docId: string) => {
    const { error } = await supabase.from("unit_documents").delete().eq("id", docId);
    if (error) throw error;
  }, []);

  // ── Vendor actions (PM CRUD via vendors table) ──

  const createVendor = useCallback(async (vendor: Vendor) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("vendors")
      .insert({
        pm_id: user.id,
        name: vendor.name,
        email: vendor.email || null,
        phone: vendor.phone || null,
        specialty: vendor.specialty || "Cleaning",
      })
      .select()
      .single();
    if (error) throw error;
    if (data) {
      setVendors(prev => ({
        ...prev,
        [data.id]: {
          id: data.id,
          name: data.name,
          email: data.email ?? "",
          phone: data.phone ?? "",
          specialty: data.specialty ?? "Cleaning",
        },
      }));
    }
  }, [user]);

  const updateVendor = useCallback(async (vendorId: string, updates: Partial<Vendor>) => {
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.specialty !== undefined) dbUpdates.specialty = updates.specialty;
    if (Object.keys(dbUpdates).length === 0) return;
    const { error } = await supabase.from("vendors").update(dbUpdates).eq("id", vendorId);
    if (error) throw error;
    setVendors(prev => {
      const vendor = prev[vendorId];
      if (!vendor) return prev;
      return { ...prev, [vendorId]: { ...vendor, ...updates } };
    });
  }, []);

  const deleteVendor = useCallback(async (vendorId: string) => {
    const { error } = await supabase.from("vendors").delete().eq("id", vendorId);
    if (error) throw error;
    setVendors(prev => {
      const next = { ...prev };
      delete next[vendorId];
      return next;
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        tasks, units, properties, vendors, loading,
        toggleChecklistItem, addPhoto, addIssue, completeTask, getProgress,
        createTask, updateTask, deleteTask, requestRework,
        createProperty, updateProperty, deleteProperty,
        createUnit, updateUnit, deleteUnit, bulkUpsertUnits,
        fetchUnitDocuments, addUnitDocument, deleteUnitDocument,
        createVendor, updateVendor, deleteVendor,
        refresh: fetchData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const TaskProvider = AppProvider;
