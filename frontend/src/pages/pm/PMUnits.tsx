import { useState, useMemo } from "react";
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
import type { Property, Unit } from "@backend/types";
import {
  Building2,
  ChevronRight,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Search,
  DoorOpen,
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-foreground">Properties & Units</h2>
        <Button onClick={openAddProperty} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Property
        </Button>
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
    </div>
  );
};

export default PMUnits;
