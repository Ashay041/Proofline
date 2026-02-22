/**
 * AppContext — Supabase-backed state management.
 * 
 * Replaces the old localStorage/mock data approach with real Supabase queries.
 */
import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { fromDbStatus, fromDbPriority, toDbStatus, toDbPriority } from "@/lib/statusMapping";
import type { Task, Unit, Vendor, ReportedIssue, ChecklistItem, ReworkItem, TaskSubmission } from "@/types";
import type { Json } from "@/integrations/supabase/types";

// ─── Context shape ──────────────────────────────────────────────

interface AppState {
  tasks: Record<string, Task>;
  units: Record<string, Unit>;
  vendors: Record<string, Vendor>;
  loading: boolean;
  // Task actions
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  addPhoto: (taskId: string, photoUrl: string) => void;
  addIssue: (taskId: string, issue: ReportedIssue) => void;
  completeTask: (taskId: string) => void;
  getProgress: (taskId: string) => number;
  createTask: (task: Task) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  requestRework: (taskId: string, reworkItems: ReworkItem[], reworkNote?: string) => void;
  // Unit actions
  updateUnit: (unitId: string, updates: Partial<Unit>) => void;
  // Vendor actions
  createVendor: (vendor: Vendor) => void;
  updateVendor: (vendorId: string, updates: Partial<Vendor>) => void;
  deleteVendor: (vendorId: string) => void;
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
  const [vendors, setVendors] = useState<Record<string, Vendor>>({});
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) {
      setTasks({});
      setUnits({});
      setVendors({});
      setLoading(false);
      return;
    }

    setLoading(true);

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

    const tasksMap: Record<string, Task> = {};
    (dbTasks ?? []).forEach(t => {
      tasksMap[t.id] = {
        id: t.id,
        unitId: t.unit_id,
        vendorId: t.vendor_id,
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

    // Fetch units + properties
    const { data: dbUnits } = await supabase.from("units").select("*, properties(name, address)");
    const unitsMap: Record<string, Unit> = {};
    (dbUnits ?? []).forEach((u: any) => {
      const unitTaskIds = (dbTasks ?? []).filter(t => t.unit_id === u.id).map(t => t.id);
      unitsMap[u.id] = {
        id: u.id,
        unitNumber: u.unit_number,
        propertyName: u.properties?.name ?? "",
        address: u.properties?.address ?? "",
        turnoverStatus: "",
        taskIds: unitTaskIds,
      };
    });
    setUnits(unitsMap);

    // Fetch vendors (profiles with vendor role)
    if (role === "pm") {
      const { data: vendorRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "vendor");
      const vendorIds = (vendorRoles ?? []).map(r => r.user_id);
      if (vendorIds.length > 0) {
        const { data: vendorProfiles } = await supabase
          .from("profiles")
          .select("*")
          .in("id", vendorIds);
        const vendorsMap: Record<string, Vendor> = {};
        (vendorProfiles ?? []).forEach(v => {
          vendorsMap[v.id] = {
            id: v.id,
            name: v.full_name,
            email: v.email ?? "",
            phone: v.phone ?? "",
            specialty: v.specialty ?? "",
          };
        });
        setVendors(vendorsMap);
      }
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

  const completeTask = useCallback(async (taskId: string) => {
    await supabase.from("tasks").update({ status: "completed" }).eq("id", taskId);
    setTasks(prev => {
      const task = prev[taskId];
      if (!task) return prev;
      // Create submission record
      supabase.from("task_submissions").insert({
        task_id: taskId,
        checklist_snapshot: task.checklist as unknown as Json,
        photos: task.photos,
      }).then();
      return { ...prev, [taskId]: { ...task, status: "Completed" } };
    });
  }, []);

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

    if (data && !error) {
      const newTask: Task = { ...task, id: data.id };
      setTasks(prev => ({ ...prev, [data.id]: newTask }));
      setUnits(prev => {
        const unit = prev[task.unitId];
        if (!unit) return prev;
        return { ...prev, [task.unitId]: { ...unit, taskIds: [...unit.taskIds, data.id] } };
      });
    }
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

    await supabase.from("tasks").update(dbUpdates).eq("id", taskId);
    setTasks(prev => {
      const task = prev[taskId];
      if (!task) return prev;
      return { ...prev, [taskId]: { ...task, ...updates } };
    });
  }, []);

  const deleteTask = useCallback(async (taskId: string) => {
    await supabase.from("tasks").delete().eq("id", taskId);
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
    setTasks(prev => {
      const task = prev[taskId];
      if (!task) return prev;

      // Create submission record
      const submission: TaskSubmission = {
        checklist: [...task.checklist],
        photos: [...task.photos],
        submittedAt: new Date().toISOString(),
        reworkItems,
        reworkNote,
      };

      supabase.from("task_submissions").insert({
        task_id: taskId,
        checklist_snapshot: task.checklist as unknown as Json,
        photos: task.photos,
        rework_items: reworkItems as unknown as Json,
        rework_note: reworkNote || null,
      }).then();

      const flaggedIds = new Set(reworkItems.map(r => r.checklistItemId));
      const checklist = task.checklist.map(c =>
        flaggedIds.has(c.id) ? { ...c, checked: false } : c
      );

      // Update task in DB
      supabase.from("tasks").update({
        status: "rework",
        rework_note: reworkNote || null,
        rework_items: reworkItems as unknown as Json,
        checklist: checklist as unknown as Json,
        photos: [],
      }).eq("id", taskId).then();

      return {
        ...prev,
        [taskId]: {
          ...task,
          status: "Rework",
          reworkNote,
          reworkItems,
          checklist,
          photos: [],
          submissionHistory: [...(task.submissionHistory ?? []), submission],
        },
      };
    });
  }, []);

  // ── Unit actions ──

  const updateUnit = useCallback(async (unitId: string, updates: Partial<Unit>) => {
    setUnits(prev => {
      const unit = prev[unitId];
      if (!unit) return prev;
      return { ...prev, [unitId]: { ...unit, ...updates } };
    });
  }, []);

  // ── Vendor actions (PM creates profiles for vendors) ──

  const createVendor = useCallback(async (vendor: Vendor) => {
    // Note: In production, vendors self-register. This is a PM-side reference only.
    setVendors(prev => ({ ...prev, [vendor.id]: vendor }));
  }, []);

  const updateVendor = useCallback(async (vendorId: string, updates: Partial<Vendor>) => {
    setVendors(prev => {
      const vendor = prev[vendorId];
      if (!vendor) return prev;
      return { ...prev, [vendorId]: { ...vendor, ...updates } };
    });
  }, []);

  const deleteVendor = useCallback(async (vendorId: string) => {
    setVendors(prev => {
      const next = { ...prev };
      delete next[vendorId];
      return next;
    });
  }, []);

  return (
    <AppContext.Provider
      value={{
        tasks, units, vendors, loading,
        toggleChecklistItem, addPhoto, addIssue, completeTask, getProgress,
        createTask, updateTask, deleteTask, requestRework,
        updateUnit,
        createVendor, updateVendor, deleteVendor,
        refresh: fetchData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const TaskProvider = AppProvider;
