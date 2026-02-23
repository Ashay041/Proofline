import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { useAppState } from "@/context/TaskContext";
import { type Task, type ChecklistItem } from "@backend/types";
import { Plus, Pencil, Trash2, CheckCircle2, Eye, Camera, RotateCcw, Search, SlidersHorizontal, ClipboardList } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import PMTaskReviewDialog from "@/components/PMTaskReviewDialog";
import * as TaskService from "@backend/services/taskService";

import { statusColor } from "@backend/lib/statusColor";

const emptyForm = {
  name: "",
  description: "",
  unitId: "",
  vendorId: "",
  priority: "Medium" as Task["priority"],
  estimatedDuration: "",
  dueDate: "",
  checklistText: "",
  specsText: "",
};

const PMTasks = () => {
  const { tasks, units, vendors, createTask, updateTask, deleteTask, getProgress } = useAppState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [reviewTask, setReviewTask] = useState<Task | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("status");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const taskList = Object.values(tasks);
  const unitList = Object.values(units);
  const vendorList = Object.values(vendors);

  // Apply filters
  const filteredTasks = taskList.filter((t) => {
    if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase()) && !t.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (vendorFilter !== "all" && t.vendorId !== vendorFilter) return false;
    if (unitFilter !== "all" && t.unitId !== unitFilter) return false;
    if (priorityFilter !== "all" && t.priority !== priorityFilter) return false;
    return true;
  });

  // Sort
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "priority") {
      const order = { High: 0, Medium: 1, Low: 2 };
      return order[a.priority] - order[b.priority];
    }
    if (sortBy === "dueDate") return a.dueDate.localeCompare(b.dueDate);
    if (sortBy === "name") return a.name.localeCompare(b.name);
    // default: status grouping
    const statusOrder = { Completed: 0, Rework: 1, "In Progress": 2, "Not Started": 3, Approved: 4 };
    return (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5);
  });

  const reworkResubmissions = sortedTasks.filter((t) => TaskService.isReworkResubmission(t));
  const newSubmissions = sortedTasks.filter((t) => t.status === "Completed" && !TaskService.isReworkResubmission(t));
  const otherTasks = sortedTasks.filter((t) => t.status !== "Completed");

  const hasActiveFilters = searchQuery || statusFilter !== "all" || vendorFilter !== "all" || unitFilter !== "all" || priorityFilter !== "all";

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(task.id);
    setForm({
      name: task.name,
      description: task.description,
      unitId: task.unitId,
      vendorId: task.vendorId,
      priority: task.priority,
      estimatedDuration: task.estimatedDuration,
      dueDate: task.dueDate,
      checklistText: task.checklist.map((c) => c.label).join("\n"),
      specsText: task.specifications.join("\n"),
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.unitId || !form.vendorId) {
      toast({ title: "Missing fields", description: "Name, unit, and vendor are required." });
      return;
    }

    const checklist: ChecklistItem[] = form.checklistText
      .split("\n")
      .filter((l) => l.trim())
      .map((label, i) => ({ id: `c${i + 1}`, label: label.trim(), checked: false }));

    const specifications = form.specsText
      .split("\n")
      .filter((l) => l.trim())
      .map((s) => s.trim());

    try {
      if (editingId) {
        await updateTask(editingId, {
          name: form.name,
          description: form.description,
          unitId: form.unitId,
          vendorId: form.vendorId,
          priority: form.priority,
          estimatedDuration: form.estimatedDuration,
          dueDate: form.dueDate,
          checklist,
          specifications,
        });
        toast({ title: "Task updated" });
      } else {
        const newTask: Task = {
          id: `task-${Date.now()}`,
          unitId: form.unitId,
          vendorId: form.vendorId,
          name: form.name,
          description: form.description,
          status: "Not Started",
          priority: form.priority,
          estimatedDuration: form.estimatedDuration,
          dueDate: form.dueDate,
          checklist,
          specifications,
          photos: [],
          issues: [],
        };
        await createTask(newTask);
        toast({ title: "Task created" });
      }
      setDialogOpen(false);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Failed to save task";
      toast({ title: "Failed to save task", description: msg, variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteTask(deleteTarget);
      toast({ title: "Task deleted" });
      setDeleteTarget(null);
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "message" in err ? String((err as { message: string }).message) : "Failed to delete task";
      toast({ title: "Failed to delete task", description: msg, variant: "destructive" });
    }
  };

  const renderTaskCard = (task: Task) => {
    const vendor = vendors[task.vendorId];
    const unit = units[task.unitId];
    const progress = getProgress(task.id);
    return (
      <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setReviewTask(task)}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">{task.name}</p>
              <p className="text-sm text-muted-foreground">{task.description}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setReviewTask(task); }} title="View details">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => openEdit(task, e)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(task.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {TaskService.isReworkResubmission(task) ? (
              <Badge className="bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100">
                <RotateCcw className="h-3 w-3 mr-1" /> Rework Resubmission
              </Badge>
            ) : (
              <Badge variant="outline" className={statusColor(task.status)}>{task.status}</Badge>
            )}
            {(task.submissionHistory ?? []).length > 0 && (
              <Badge variant="outline" className="text-muted-foreground">
                Attempt #{TaskService.getSubmissionAttempt(task)}
              </Badge>
            )}
            <Badge variant="outline" className={
              task.priority === "High" ? "border-destructive/30 text-destructive" : ""
            }>{task.priority}</Badge>
            {unit && <Badge variant="outline">Unit {unit.unitNumber}</Badge>}
            {vendor && <Badge variant="secondary">{vendor.name}</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground">{progress}%</span>
          </div>
          {task.photos.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Camera className="h-3.5 w-3.5" /> {task.photos.length} photo(s)
            </div>
          )}
          {task.reworkNote && task.status === "Rework" && (
            <div className="rounded border border-orange-200 bg-orange-50 p-2 text-sm text-orange-800">
              <span className="font-medium">Rework note:</span> {task.reworkNote}
            </div>
          )}
          {task.issues.length > 0 && (
            <p className="text-xs text-destructive font-medium">{task.issues.length} issue(s) reported</p>
          )}
        </CardContent>
      </Card>
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setVendorFilter("all");
    setUnitFilter("all");
    setPriorityFilter("all");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Tasks</h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Task
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Not Started">Not Started</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rework">Rework</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={vendorFilter} onValueChange={setVendorFilter}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Vendor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {vendorList.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={unitFilter} onValueChange={setUnitFilter}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              {unitList.map((u) => (
                <SelectItem key={u.id} value={u.id}>Unit {u.unitNumber}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SlidersHorizontal className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="priority">By Priority</SelectItem>
              <SelectItem value="dueDate">By Due Date</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
        {hasActiveFilters && (
          <p className="text-xs text-muted-foreground">{filteredTasks.length} of {taskList.length} tasks shown</p>
        )}
      </div>

      {/* Empty state */}
      {taskList.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <ClipboardList className="h-12 w-12 text-muted-foreground/50" />
          <div>
            <p className="font-semibold text-foreground">No tasks yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first task to start managing turnover work.</p>
          </div>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Create First Task
          </Button>
        </div>
      )}

      {/* No results from filters */}
      {taskList.length > 0 && filteredTasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <Search className="h-10 w-10 text-muted-foreground/50" />
          <div>
            <p className="font-semibold text-foreground">No matching tasks</p>
            <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search query.</p>
          </div>
          <Button variant="outline" size="sm" onClick={clearFilters}>Clear all filters</Button>
        </div>
      )}

      {reworkResubmissions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-orange-700 flex items-center gap-1.5">
            <RotateCcw className="h-4 w-4" /> Rework Returns ({reworkResubmissions.length})
          </h3>
          {reworkResubmissions.map(renderTaskCard)}
        </div>
      )}

      {newSubmissions.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" /> New Submissions ({newSubmissions.length})
          </h3>
          {newSubmissions.map(renderTaskCard)}
        </div>
      )}

      {otherTasks.length > 0 && (
        <div className="space-y-3">
          {(reworkResubmissions.length > 0 || newSubmissions.length > 0) && (
            <h3 className="text-sm font-semibold text-muted-foreground">All Tasks ({otherTasks.length})</h3>
          )}
          {otherTasks.map(renderTaskCard)}
        </div>
      )}

      {/* Task Review Dialog */}
      <PMTaskReviewDialog
        task={reviewTask}
        open={!!reviewTask}
        onOpenChange={(open) => { if (!open) setReviewTask(null); }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The task and all its data (photos, checklist progress, submission history) will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Task" : "Create Task"}</DialogTitle>
            <DialogDescription>
              {editingId ? "Update task details below." : "Fill in the details for the new task."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Task Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Unit *</label>
                <Select value={form.unitId} onValueChange={(v) => setForm({ ...form, unitId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select unit" /></SelectTrigger>
                  <SelectContent>
                    {unitList.map((u) => (
                      <SelectItem key={u.id} value={u.id}>Unit {u.unitNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Vendor *</label>
                <Select value={form.vendorId} onValueChange={(v) => setForm({ ...form, vendorId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendorList.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">Priority</label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Task["priority"] })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Due Date</label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className="mt-1" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Est. Duration</label>
              <Input value={form.estimatedDuration} onChange={(e) => setForm({ ...form, estimatedDuration: e.target.value })} placeholder="e.g. 4 hours" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Checklist Items (one per line)</label>
              <Textarea value={form.checklistText} onChange={(e) => setForm({ ...form, checklistText: e.target.value })} rows={4} placeholder="Clean kitchen counters&#10;Scrub bathroom tiles&#10;Vacuum all rooms" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Specifications (one per line)</label>
              <Textarea value={form.specsText} onChange={(e) => setForm({ ...form, specsText: e.target.value })} rows={3} placeholder="Use EcoClean for counters&#10;Do NOT use bleach on hardwood" className="mt-1" />
            </div>
            <Button className="w-full" onClick={handleSave}>
              {editingId ? "Save Changes" : "Create Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PMTasks;
