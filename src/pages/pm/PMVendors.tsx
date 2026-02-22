import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { useAppState } from "@/context/TaskContext";
import { type Vendor } from "@/types";
import { Plus, Pencil, Trash2, Phone, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const emptyForm = { name: "", email: "", phone: "", specialty: "Cleaning" };

const PMVendors = () => {
  const { vendors, tasks, createVendor, updateVendor, deleteVendor } = useAppState();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const vendorList = Object.values(vendors);
  const taskList = Object.values(tasks);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (vendor: Vendor) => {
    setEditingId(vendor.id);
    setForm({ name: vendor.name, email: vendor.email, phone: vendor.phone, specialty: vendor.specialty });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: "Name is required" });
      return;
    }
    if (editingId) {
      updateVendor(editingId, form);
      toast({ title: "Vendor updated" });
    } else {
      createVendor({ id: `vendor-${Date.now()}`, ...form });
      toast({ title: "Vendor added" });
    }
    setDialogOpen(false);
  };

  const handleDelete = (vendorId: string) => {
    const assignedTasks = taskList.filter((t) => t.vendorId === vendorId);
    if (assignedTasks.length > 0) {
      toast({ title: "Cannot delete", description: "This vendor has assigned tasks. Remove tasks first." });
      return;
    }
    deleteVendor(vendorId);
    toast({ title: "Vendor removed" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-foreground">Vendors</h2>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Vendor
        </Button>
      </div>

      <div className="space-y-3">
        {vendorList.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No vendors yet. Add your first vendor.</p>
        )}
        {vendorList.map((vendor) => {
          const assignedTasks = taskList.filter((t) => t.vendorId === vendor.id);
          const completedCount = assignedTasks.filter((t) => t.status === "Completed").length;
          return (
            <Card key={vendor.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{vendor.name}</p>
                    <Badge variant="secondary" className="mt-1">{vendor.specialty}</Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(vendor)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(vendor.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {vendor.email}</span>
                  <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {vendor.phone}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {assignedTasks.length} task(s) assigned, {completedCount} completed
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Vendor" : "Add Vendor"}</DialogTitle>
            <DialogDescription>{editingId ? "Update vendor info." : "Enter vendor details."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground">Name *</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Phone</label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Specialty</label>
              <Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className="mt-1" />
            </div>
            <Button className="w-full" onClick={handleSave}>
              {editingId ? "Save Changes" : "Add Vendor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PMVendors;
