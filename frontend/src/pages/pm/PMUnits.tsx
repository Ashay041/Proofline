import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppState } from "@/context/TaskContext";
import { supabase } from "@backend/integrations/supabase/client";
import type { Property, Unit } from "@backend/types";
import { parseRentRoll, type ParsedUnit } from "@/lib/rentRollParser";
import {
  Building2,
  ChevronRight,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Search,
  DoorOpen,
  Upload,
  FileSpreadsheet,
  Loader2,
  X,
  PlusCircle,
  Minus,
  GripVertical,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const emptyPropertyForm = { name: "", address: "" };
const emptyUnitForm = { unitNumber: "" };

const PMUnits = () => {
  const navigate = useNavigate();
  const {
    units,
    properties,
    tasks,
    createProperty,
    updateProperty,
    deleteProperty,
    createUnit,
    updateUnit,
    deleteUnit,
    bulkUpsertUnits,
  } = useAppState();

  const [searchQuery, setSearchQuery] = useState("");
  const [propertyFilter, setPropertyFilter] = useState<string>("all");

  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<string | null>(null);
  const [propertyForm, setPropertyForm] = useState(emptyPropertyForm);

  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [unitForPropertyId, setUnitForPropertyId] = useState<string | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitForm, setUnitForm] = useState(emptyUnitForm);

  const [deletePropertyTarget, setDeletePropertyTarget] = useState<string | null>(null);
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<string | null>(null);

  // Rent roll upload state
  const [rentRollOpen, setRentRollOpen] = useState(false);
  const [rrStep, setRrStep] = useState<"upload" | "preview">("upload");
  const [rrPropertyId, setRrPropertyId] = useState<string>("__new__");
  const [rrNewPropertyName, setRrNewPropertyName] = useState("");
  const [rrNewPropertyAddress, setRrNewPropertyAddress] = useState("");
  const [rrParsedUnits, setRrParsedUnits] = useState<ParsedUnit[]>([]);
  const [rrFileName, setRrFileName] = useState("");
  const [rrParsing, setRrParsing] = useState(false);
  const [rrImporting, setRrImporting] = useState(false);
  const [rrColumns, setRrColumns] = useState<(keyof ParsedUnit)[]>([]);
  const [dragRowIdx, setDragRowIdx] = useState<number | null>(null);
  const [dropRowIdx, setDropRowIdx] = useState<number | null>(null);
  const [dragColKey, setDragColKey] = useState<keyof ParsedUnit | null>(null);
  const [dropColKey, setDropColKey] = useState<keyof ParsedUnit | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const propertyList = useMemo(() => Object.values(properties), [properties]);
  const unitList = useMemo(() => Object.values(units), [units]);

  const query = searchQuery.trim().toLowerCase();
  const filteredUnits = useMemo(() => {
    return unitList.filter((u) => {
      if (propertyFilter !== "all" && u.propertyId !== propertyFilter) return false;
      if (!query) return true;
      return (
        u.unitNumber.toLowerCase().includes(query) ||
        u.propertyName.toLowerCase().includes(query) ||
        (u.address && u.address.toLowerCase().includes(query))
      );
    });
  }, [unitList, propertyFilter, query]);

  const unitsByProperty = useMemo(() => {
    const map: Record<string, Unit[]> = {};
    filteredUnits.forEach((u) => {
      if (!map[u.propertyId]) map[u.propertyId] = [];
      map[u.propertyId].push(u);
    });
    return map;
  }, [filteredUnits]);

  const propertiesToShow = useMemo(() => {
    if (propertyFilter !== "all") {
      const p = properties[propertyFilter];
      return p ? [p] : [];
    }
    return propertyList;
  }, [propertyFilter, propertyList, properties]);

  const openAddProperty = () => {
    setEditingPropertyId(null);
    setPropertyForm(emptyPropertyForm);
    setPropertyDialogOpen(true);
  };

  const openEditProperty = (p: Property) => {
    setEditingPropertyId(p.id);
    setPropertyForm({ name: p.name, address: p.address });
    setPropertyDialogOpen(true);
  };

  const handleSaveProperty = async () => {
    if (!propertyForm.name.trim()) {
      toast({ title: "Property name is required" });
      return;
    }
    try {
      if (editingPropertyId) {
        await updateProperty(editingPropertyId, {
          name: propertyForm.name.trim(),
          address: propertyForm.address.trim() || undefined,
        });
        toast({ title: "Property updated" });
      } else {
        await createProperty(propertyForm.name.trim(), propertyForm.address.trim() || undefined);
        toast({ title: "Property added" });
      }
      setPropertyDialogOpen(false);
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Failed to save property";
      toast({ title: "Failed to save property", description: message, variant: "destructive" });
    }
  };

  const handleDeleteProperty = async (propertyId: string) => {
    const count = unitList.filter((u) => u.propertyId === propertyId).length;
    if (count > 0) {
      toast({
        title: "Cannot delete property",
        description: "Remove all units from this property first.",
        variant: "destructive",
      });
      setDeletePropertyTarget(null);
      return;
    }
    try {
      await deleteProperty(propertyId);
      toast({ title: "Property removed" });
      setDeletePropertyTarget(null);
    } catch {
      toast({ title: "Failed to delete property", variant: "destructive" });
    }
  };

  const openAddUnit = (propertyId: string) => {
    setUnitForPropertyId(propertyId);
    setEditingUnitId(null);
    setUnitForm(emptyUnitForm);
    setUnitDialogOpen(true);
  };

  const openEditUnit = (u: Unit) => {
    setUnitForPropertyId(u.propertyId);
    setEditingUnitId(u.id);
    setUnitForm({ unitNumber: u.unitNumber });
    setUnitDialogOpen(true);
  };

  const handleSaveUnit = async () => {
    const num = unitForm.unitNumber.trim();
    if (!num) {
      toast({ title: "Unit number is required" });
      return;
    }
    if (!unitForPropertyId) return;
    try {
      if (editingUnitId) {
        await updateUnit(editingUnitId, { unitNumber: num });
        toast({ title: "Unit updated" });
      } else {
        await createUnit(unitForPropertyId, num);
        toast({ title: "Unit added" });
      }
      setUnitDialogOpen(false);
    } catch {
      toast({ title: "Failed to save unit", variant: "destructive" });
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    const unit = units[unitId];
    if (!unit) return;
    const taskCount = unit.taskIds?.length ?? 0;
    if (taskCount > 0) {
      toast({
        title: "Cannot delete unit",
        description: "This unit has tasks. Remove or reassign tasks first.",
        variant: "destructive",
      });
      setDeleteUnitTarget(null);
      return;
    }
    try {
      await deleteUnit(unitId);
      toast({ title: "Unit removed" });
      setDeleteUnitTarget(null);
    } catch {
      toast({ title: "Failed to delete unit", variant: "destructive" });
    }
  };

  const resetRentRoll = () => {
    setRrStep("upload");
    setRrPropertyId("__new__");
    setRrNewPropertyName("");
    setRrNewPropertyAddress("");
    setRrParsedUnits([]);
    setRrFileName("");
    setRrParsing(false);
    setRrImporting(false);
    setRrColumns([]);
  };

  const updateRrUnit = (index: number, field: keyof ParsedUnit, value: unknown) => {
    setRrParsedUnits(prev => prev.map((u, i) => i === index ? { ...u, [field]: value } : u));
  };

  const removeRrUnit = (index: number) => {
    setRrParsedUnits(prev => prev.filter((_, i) => i !== index));
  };

  const addEmptyRrUnit = (afterIndex?: number) => {
    setRrParsedUnits(prev => {
      const newRow: ParsedUnit = { unitNumber: "" };
      if (afterIndex != null) {
        const next = [...prev];
        next.splice(afterIndex + 1, 0, newRow);
        return next;
      }
      return [...prev, newRow];
    });
  };

  const ALL_COLUMNS: { key: keyof ParsedUnit; label: string; type: "text" | "number" | "date" }[] = [
    { key: "unitNumber", label: "Unit", type: "text" },
    { key: "tenantName", label: "Tenant", type: "text" },
    { key: "leaseStatus", label: "Status", type: "text" },
    { key: "sqFt", label: "Sq Ft", type: "number" },
    { key: "leaseStart", label: "Lease Start", type: "date" },
    { key: "leaseEnd", label: "Lease End", type: "date" },
    { key: "monthlyRent", label: "Rent", type: "number" },
    { key: "marketRent", label: "Market Rent", type: "number" },
    { key: "securityDeposit", label: "Deposit", type: "number" },
    { key: "parking", label: "Parking", type: "number" },
    { key: "petRent", label: "Pet Rent", type: "number" },
    { key: "occupants", label: "Occupants", type: "number" },
    { key: "arrears", label: "Arrears", type: "number" },
    { key: "moveInSpecials", label: "Move-in Specials", type: "text" },
    { key: "subsidizedRent", label: "Subsidized", type: "number" },
    { key: "lastPaidDate", label: "Last Paid", type: "date" },
    { key: "utilityBillbacks", label: "Billbacks", type: "number" },
    { key: "leaseBreakFee", label: "Break Fee", type: "number" },
    { key: "annualRent", label: "Annual Rent", type: "number" },
    { key: "unitType", label: "Unit Type", type: "text" },
    { key: "notes", label: "Notes", type: "text" },
  ];

  const colMeta = (key: keyof ParsedUnit) => ALL_COLUMNS.find(c => c.key === key);
  const addableColumns = ALL_COLUMNS.filter(c => !rrColumns.includes(c.key));

  const autoDetectColumns = (units: ParsedUnit[]) => {
    const found: (keyof ParsedUnit)[] = ["unitNumber"];
    for (const col of ALL_COLUMNS) {
      if (col.key === "unitNumber") continue;
      if (units.some(u => u[col.key] != null && u[col.key] !== "")) {
        found.push(col.key);
      }
    }
    setRrColumns(found);
  };

  const removeRrColumn = (key: keyof ParsedUnit) => {
    if (key === "unitNumber") return;
    setRrColumns(prev => prev.filter(k => k !== key));
    setRrParsedUnits(prev => prev.map(u => { const next = { ...u }; delete (next as any)[key]; return next; }));
  };

  const addRrColumn = (key: keyof ParsedUnit) => {
    setRrColumns(prev => [...prev, key]);
  };

  const handleRowDragEnd = () => {
    if (dragRowIdx != null && dropRowIdx != null && dragRowIdx !== dropRowIdx) {
      setRrParsedUnits(prev => {
        const next = [...prev];
        const [moved] = next.splice(dragRowIdx, 1);
        next.splice(dropRowIdx, 0, moved);
        return next;
      });
    }
    setDragRowIdx(null);
    setDropRowIdx(null);
  };

  const handleColDragEnd = () => {
    if (dragColKey != null && dropColKey != null && dragColKey !== dropColKey) {
      setRrColumns(prev => {
        const next = [...prev];
        const fromIdx = next.indexOf(dragColKey);
        const toIdx = next.indexOf(dropColKey);
        if (fromIdx === -1 || toIdx === -1) return prev;
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, dragColKey);
        return next;
      });
    }
    setDragColKey(null);
    setDropColKey(null);
  };

  const handleRentRollFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setRrFileName(file.name);
    setRrParsing(true);
    try {
      const parsed = await parseRentRoll(file);
      if (parsed.length === 0) {
        toast({ title: "No units found", description: "The file didn't contain any parseable unit rows.", variant: "destructive" });
        setRrParsing(false);
        return;
      }
      setRrParsedUnits(parsed);
      autoDetectColumns(parsed);
      setRrStep("preview");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to parse file";
      toast({ title: "Parse error", description: msg, variant: "destructive" });
    }
    setRrParsing(false);
  };

  const handleRentRollImport = async () => {
    const validUnits = rrParsedUnits.filter(u => u.unitNumber.trim());
    if (validUnits.length === 0) {
      toast({ title: "No valid units", description: "Every unit must have a unit number.", variant: "destructive" });
      return;
    }

    setRrImporting(true);
    try {
      let targetPropertyId = rrPropertyId;
      if (rrPropertyId === "__new__") {
        const propName = rrNewPropertyName.trim() || "Default Property";
        await createProperty(propName, rrNewPropertyAddress.trim() || undefined);
        await new Promise(r => setTimeout(r, 100));

        const allProps = Object.values(properties);
        const newProp = allProps.find(p => p.name === propName);
        if (!newProp) {
          const { data } = await supabase.from("properties").select("id").eq("name", propName).limit(1).single();
          if (!data) {
            toast({ title: "Failed to find created property", variant: "destructive" });
            setRrImporting(false);
            return;
          }
          targetPropertyId = data.id;
        } else {
          targetPropertyId = newProp.id;
        }
      }

      await bulkUpsertUnits(targetPropertyId, validUnits);
      toast({ title: "Rent roll imported", description: `${validUnits.length} unit(s) imported successfully.` });
      setRentRollOpen(false);
      resetRentRoll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast({ title: "Import failed", description: msg, variant: "destructive" });
    }
    setRrImporting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-foreground">Properties & Units</h2>
        <div className="flex gap-2">
          <Button onClick={() => { resetRentRoll(); setRentRollOpen(true); }} size="sm" variant="outline">
            <Upload className="h-4 w-4 mr-1" /> Upload Rent Roll
          </Button>
          <Button onClick={openAddProperty} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Add Property
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by unit number, property name, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={propertyFilter} onValueChange={setPropertyFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
            <SelectValue placeholder="All properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All properties</SelectItem>
            {propertyList.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {propertyList.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No properties yet. Add a property first, then add units under it.
        </p>
      )}

      <div className="space-y-6">
        {propertiesToShow.map((property) => {
          const propUnits = unitsByProperty[property.id] ?? [];
          return (
            <Card key={property.id}>
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">{property.name}</p>
                      {property.address && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {property.address}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditProperty(property)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeletePropertyTarget(property.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddUnit(property.id)}
                    >
                      <DoorOpen className="h-4 w-4 mr-1" /> Add Unit
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Units ({propUnits.length})
                  </p>
                  {propUnits.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">
                      No units. Add a unit for this property.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {propUnits.map((unit) => {
                        const unitTasks = (unit.taskIds ?? []).map((id) => tasks[id]).filter(Boolean);
                        const doneCount = unitTasks.filter(
                          (t) => t.status === "Approved" || t.status === "Completed"
                        ).length;
                        const issues = unitTasks.reduce((sum, t) => sum + t.issues.length, 0);
                        const progress = unitTasks.length
                          ? Math.round((doneCount / unitTasks.length) * 100)
                          : 0;
                        const allApproved =
                          unitTasks.length > 0 &&
                          unitTasks.every((t) => t.status === "Approved");
                        const anyInProgress = unitTasks.some((t) =>
                          ["In Progress", "Rework", "Completed"].includes(t.status)
                        );
                        const derivedStatus = allApproved
                          ? "Complete"
                          : anyInProgress
                            ? "In Progress"
                            : "Not Started";
                        const statusStyle = allApproved
                          ? "bg-emerald-500/15 text-emerald-700 border-emerald-200"
                          : anyInProgress
                            ? "bg-amber-500/15 text-amber-700 border-amber-200"
                            : "bg-muted text-muted-foreground";

                        return (
                          <Card
                            key={unit.id}
                            className="cursor-pointer active:scale-[0.98] transition-transform"
                            onClick={() => navigate(`/pm/units/${unit.id}`)}
                          >
                            <CardContent className="p-3 flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-foreground">Unit {unit.unitNumber}</p>
                                {(unit.unitType || unit.sqFt || unit.monthlyRent || unit.leaseStatus) && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {[
                                      unit.leaseStatus,
                                      unit.unitType,
                                      unit.sqFt ? `${unit.sqFt} sqft` : null,
                                      unit.monthlyRent != null ? `$${unit.monthlyRent.toLocaleString()}/mo` : null,
                                    ].filter(Boolean).join(" · ")}
                                  </p>
                                )}
                                {unit.tenantName && (
                                  <p className="text-xs text-muted-foreground">{unit.tenantName}</p>
                                )}
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <Badge variant="outline" className={statusStyle}>
                                    {derivedStatus}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {unitTasks.length} task(s), {doneCount} done
                                    {issues > 0 && (
                                      <span className="text-destructive font-medium ml-1">
                                        {issues} issue(s)
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <Progress value={progress} className="h-1.5 mt-1.5" />
                              </div>
                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditUnit(unit)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => setDeleteUnitTarget(unit.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {propertyFilter === "all" && propertyList.length > 0 && filteredUnits.length === 0 && query && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No units match &quot;{searchQuery}&quot;. Try a different search or filter.
        </p>
      )}

      {/* Property create/edit dialog */}
      <Dialog open={propertyDialogOpen} onOpenChange={setPropertyDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingPropertyId ? "Edit Property" : "Add Property"}</DialogTitle>
            <DialogDescription>
              {editingPropertyId
                ? "Update property name and address."
                : "Add a property. You can add units under it next."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Name *</label>
              <Input
                value={propertyForm.name}
                onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                placeholder="Property Name"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Address</label>
              <Input
                value={propertyForm.address}
                onChange={(e) => setPropertyForm({ ...propertyForm, address: e.target.value })}
                placeholder="Street, city"
                className="mt-1"
              />
            </div>
            <Button className="w-full" onClick={handleSaveProperty}>
              {editingPropertyId ? "Save Changes" : "Add Property"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unit create/edit dialog */}
      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingUnitId ? "Edit Unit" : "Add Unit"}</DialogTitle>
            <DialogDescription>
              {editingUnitId
                ? "Update the unit number."
                : "Add a unit under this property (e.g. 101, 2A)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Unit number *</label>
              <Input
                value={unitForm.unitNumber}
                onChange={(e) => setUnitForm({ unitNumber: e.target.value })}
                placeholder="e.g. 101 or 2A"
                className="mt-1"
              />
            </div>
            <Button className="w-full" onClick={handleSaveUnit}>
              {editingUnitId ? "Save Changes" : "Add Unit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete property confirmation */}
      <AlertDialog open={!!deletePropertyTarget} onOpenChange={(open) => !open && setDeletePropertyTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete property?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the property. You can only delete a property that has no units. Remove all units first if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletePropertyTarget && handleDeleteProperty(deletePropertyTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete unit confirmation */}
      <AlertDialog open={!!deleteUnitTarget} onOpenChange={(open) => !open && setDeleteUnitTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete unit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the unit. You cannot delete a unit that has tasks assigned. Remove or reassign tasks first if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteUnitTarget && handleDeleteUnit(deleteUnitTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rent Roll Upload Dialog */}
      <Dialog open={rentRollOpen} onOpenChange={(open) => { if (!open) { setRentRollOpen(false); resetRentRoll(); } }}>
        <DialogContent className={rrStep === "preview" ? "max-w-4xl max-h-[90vh] flex flex-col" : "max-w-md"}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {rrStep === "upload" ? "Upload Rent Roll" : "Preview & Confirm Import"}
            </DialogTitle>
            <DialogDescription>
              {rrStep === "upload"
                ? "Upload a CSV or Excel file with unit data. Existing units (matched by unit number) will be updated."
                : `${rrParsedUnits.length} unit(s) found in ${rrFileName}. Review and confirm.`}
            </DialogDescription>
          </DialogHeader>

          {rrStep === "upload" && (
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-foreground">Property *</label>
                <Select value={rrPropertyId} onValueChange={setRrPropertyId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a property" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">+ Create new property</SelectItem>
                    {propertyList.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {rrPropertyId === "__new__" && (
                <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                  <div>
                    <label className="text-sm font-medium text-foreground">Property Name</label>
                    <Input
                      value={rrNewPropertyName}
                      onChange={(e) => setRrNewPropertyName(e.target.value)}
                      placeholder="Leave blank to use file name as property name"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground">Address</label>
                    <Input
                      value={rrNewPropertyAddress}
                      onChange={(e) => setRrNewPropertyAddress(e.target.value)}
                      placeholder="Street, city"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-foreground">Rent Roll File *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleRentRollFile}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="w-full mt-1 h-20 border-dashed flex flex-col gap-1"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={rrParsing}
                >
                  {rrParsing ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> Parsing...</>
                  ) : rrFileName ? (
                    <><FileSpreadsheet className="h-5 w-5" /> {rrFileName}</>
                  ) : (
                    <><Upload className="h-5 w-5" /> Click to upload CSV or Excel</>
                  )}
                </Button>
              </div>
            </div>
          )}

          {rrStep === "preview" && (
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              <div className="flex-1 rounded-md border overflow-auto">
                <div className="min-w-max">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0 z-10">
                      <tr>
                        <th className="w-5 p-0"></th>
                        {rrColumns.map((colKey) => {
                          const meta = colMeta(colKey);
                          const isDragOver = dropColKey === colKey && dragColKey !== colKey;
                          return (
                            <th
                              key={colKey}
                              className={`text-left p-1 font-medium whitespace-nowrap cursor-grab active:cursor-grabbing select-none transition-colors ${isDragOver ? "bg-primary/10" : ""}`}
                              draggable
                              onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragColKey(colKey); }}
                              onDragOver={(e) => { e.preventDefault(); setDropColKey(colKey); }}
                              onDragLeave={() => { if (dropColKey === colKey) setDropColKey(null); }}
                              onDragEnd={handleColDragEnd}
                              onDrop={handleColDragEnd}
                            >
                              <span className="inline-flex items-center gap-0.5">
                                {meta?.label ?? colKey}
                                {colKey !== "unitNumber" && (
                                  <button
                                    className="opacity-40 hover:opacity-100 hover:text-destructive transition-opacity p-0 leading-none"
                                    onClick={() => removeRrColumn(colKey)}
                                    title={`Remove ${meta?.label} column`}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </span>
                            </th>
                          );
                        })}
                        <th className="p-1 w-[60px]">
                          {addableColumns.length > 0 && (
                            <select
                              className="h-6 w-6 opacity-40 hover:opacity-100 cursor-pointer bg-transparent appearance-none text-center"
                              value=""
                              onChange={(e) => { if (e.target.value) addRrColumn(e.target.value as keyof ParsedUnit); }}
                              title="Add column"
                              style={{ backgroundImage: "none" }}
                            >
                              <option value="" disabled>+</option>
                              {addableColumns.map(c => (
                                <option key={c.key} value={c.key}>{c.label}</option>
                              ))}
                            </select>
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rrParsedUnits.map((u, i) => {
                        const isRowDragOver = dropRowIdx === i && dragRowIdx !== i;
                        return (
                        <tr key={i} className={`border-t group/row transition-colors ${isRowDragOver ? "bg-primary/10" : ""}`}>
                          <td className="p-0 w-5 align-middle">
                            <span className="flex flex-col items-center opacity-0 group-hover/row:opacity-40 hover:!opacity-100 transition-opacity">
                              <span
                                className="cursor-grab active:cursor-grabbing flex items-center justify-center w-5 h-4"
                                draggable
                                onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.stopPropagation(); setDragRowIdx(i); }}
                                onDragOver={(e) => { e.preventDefault(); setDropRowIdx(i); }}
                                onDragLeave={() => { if (dropRowIdx === i) setDropRowIdx(null); }}
                                onDragEnd={handleRowDragEnd}
                                onDrop={handleRowDragEnd}
                                title="Drag to reorder"
                              >
                                <GripVertical className="h-3 w-3" />
                              </span>
                              <button
                                className="flex items-center justify-center w-5 h-3 hover:text-destructive"
                                onClick={() => removeRrUnit(i)}
                                title="Delete row"
                              >
                                <Minus className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          </td>
                          {rrColumns.map((colKey) => {
                            const meta = colMeta(colKey);
                            const inputType = meta?.type === "number" ? "number" : meta?.type === "date" ? "date" : "text";
                            const width = meta?.type === "date" ? "w-[110px]" : meta?.type === "number" ? "w-[70px]" : colKey === "notes" || colKey === "moveInSpecials" ? "w-[120px]" : "w-[90px]";
                            const val = u[colKey] ?? "";
                            return (
                              <td key={colKey} className="p-0.5">
                                <Input
                                  className={`h-7 text-xs ${width}`}
                                  type={inputType}
                                  value={val}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const parsed = raw === "" ? undefined : meta?.type === "number" ? Number(raw) : raw;
                                    updateRrUnit(i, colKey, parsed);
                                  }}
                                />
                              </td>
                            );
                          })}
                          <td className="p-0.5">
                            <button
                              className="opacity-0 group-hover/row:opacity-40 hover:!opacity-100 hover:text-primary transition-opacity flex items-center justify-center w-5 h-7"
                              onClick={() => addEmptyRrUnit(i)}
                              title="Insert row below"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                        );
                      })}
                      <tr className="border-t">
                        <td className="p-0 w-5"></td>
                        <td className="p-0.5" colSpan={rrColumns.length + 1}>
                          <button
                            className="h-6 w-6 rounded flex items-center justify-center opacity-30 hover:opacity-100 hover:text-primary transition-opacity"
                            onClick={() => addEmptyRrUnit()}
                            title="Add row"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <Button variant="outline" size="sm" onClick={() => { setRrStep("upload"); setRrParsedUnits([]); setRrFileName(""); setRrColumns([]); }}>
                  Back
                </Button>
                <Button onClick={handleRentRollImport} disabled={rrImporting || rrParsedUnits.length === 0}>
                  {rrImporting ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Importing...</> : `Confirm & Import ${rrParsedUnits.length} Unit(s)`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PMUnits;
