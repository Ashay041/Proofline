import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppState } from "@/context/TaskContext";
import { type Task, type UnitDocument } from "@backend/types";
import {
  ArrowLeft, MapPin, CheckCircle2, Eye, Camera,
  Upload, FileText, FileSpreadsheet, ImageIcon, Trash2, Loader2,
  Home, DollarSign, CalendarDays,
} from "lucide-react";
import PMTaskReviewDialog from "@/components/PMTaskReviewDialog";
import { statusColor } from "@backend/lib/statusColor";
import { toast } from "@/hooks/use-toast";

function docIcon(fileType: string) {
  if (fileType === "image") return <ImageIcon className="h-4 w-4 shrink-0" />;
  if (fileType === "pdf") return <FileText className="h-4 w-4 shrink-0" />;
  return <FileSpreadsheet className="h-4 w-4 shrink-0" />;
}

function detectFileType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "spreadsheet";
}

const PMUnitDetail = () => {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const { units, tasks, vendors, getProgress, fetchUnitDocuments, addUnitDocument, deleteUnitDocument } = useAppState();
  const unit = unitId ? units[unitId] : undefined;
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [documents, setDocuments] = useState<UnitDocument[]>([]);
  const [uploading, setUploading] = useState(false);

  const loadDocs = useCallback(async () => {
    if (!unitId) return;
    try {
      const docs = await fetchUnitDocuments(unitId);
      setDocuments(docs);
    } catch { /* ignore */ }
  }, [unitId, fetchUnitDocuments]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleDocUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf,.xlsx,.xls,.csv";
    input.multiple = true;
    input.onchange = async () => {
      const files = input.files;
      if (!files || !unitId) return;
      setUploading(true);
      const { uploadUnitDocument } = await import("@backend/lib/supabaseStorage");
      for (const file of Array.from(files)) {
        try {
          const url = await uploadUnitDocument(unitId, file);
          const fileType = detectFileType(file.name);
          const doc = await addUnitDocument(unitId, url, file.name, fileType);
          setDocuments(prev => [doc, ...prev]);
          toast({ title: "Document uploaded", description: file.name });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Upload failed";
          toast({ title: "Upload failed", description: msg, variant: "destructive" });
        }
      }
      setUploading(false);
    };
    input.click();
  };

  const handleDeleteDoc = async (docId: string) => {
    try {
      await deleteUnitDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
      toast({ title: "Document removed" });
    } catch {
      toast({ title: "Failed to remove document", variant: "destructive" });
    }
  };

  if (!unit) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-foreground">Unit not found</h2>
        <Button className="mt-4" onClick={() => navigate("/pm/units")}>Back to Units</Button>
      </div>
    );
  }

  const unitTasks = unit.taskIds.map((id) => tasks[id]).filter(Boolean);

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate("/pm/units")}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Units
      </Button>

      <div>
        <h2 className="text-xl font-bold text-foreground">Unit {unit.unitNumber}</h2>
        <p className="text-sm text-muted-foreground">{unit.propertyName}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <MapPin className="h-3 w-3" /> {unit.address}
        </div>
        {(() => {
          const allApproved = unitTasks.length > 0 && unitTasks.every((t) => t.status === "Approved");
          const anyInProgress = unitTasks.some((t) => ["In Progress", "Rework", "Completed"].includes(t.status));
          const derivedStatus = allApproved ? "Complete" : anyInProgress ? "In Progress" : "Not Started";
          const statusStyle = allApproved
            ? "bg-emerald-500/15 text-emerald-700 border-emerald-200"
            : anyInProgress
              ? "bg-amber-500/15 text-amber-700 border-amber-200"
              : "bg-muted text-muted-foreground";
          return <Badge variant="outline" className={`mt-2 ${statusStyle}`}>{derivedStatus}</Badge>;
        })()}
      </div>

      {/* Lease / Rent Roll Details */}
      {(unit.unitType || unit.sqFt || unit.tenantName || unit.monthlyRent) && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-1.5">
              <Home className="h-4 w-4" /> Unit Details
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {unit.tenantName && <div><span className="text-muted-foreground">Tenant:</span> <span className="font-medium">{unit.tenantName}</span></div>}
              {unit.leaseStatus && <div><span className="text-muted-foreground">Status:</span> <span className="font-medium">{unit.leaseStatus}</span></div>}
              {unit.unitType && <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{unit.unitType}</span></div>}
              {unit.sqFt && <div><span className="text-muted-foreground">Sq Ft:</span> <span className="font-medium">{unit.sqFt.toLocaleString()}</span></div>}
              {unit.occupants != null && <div><span className="text-muted-foreground">Occupants:</span> <span className="font-medium">{unit.occupants}</span></div>}
              {unit.monthlyRent != null && <div><span className="text-muted-foreground">Current Rent:</span> <span className="font-medium">${unit.monthlyRent.toLocaleString()}/mo</span></div>}
              {unit.marketRent != null && <div><span className="text-muted-foreground">Market Rent:</span> <span className="font-medium">${unit.marketRent.toLocaleString()}/mo</span></div>}
              {unit.annualRent != null && <div><span className="text-muted-foreground">Annual Rent:</span> <span className="font-medium">${unit.annualRent.toLocaleString()}</span></div>}
              {unit.securityDeposit != null && <div><span className="text-muted-foreground">Deposit:</span> <span className="font-medium">${unit.securityDeposit.toLocaleString()}</span></div>}
              {unit.leaseStart && <div><span className="text-muted-foreground">Lease Start:</span> <span className="font-medium">{unit.leaseStart}</span></div>}
              {unit.leaseEnd && <div><span className="text-muted-foreground">Lease End:</span> <span className="font-medium">{unit.leaseEnd}</span></div>}
              {unit.leaseTermMonths && <div><span className="text-muted-foreground">Term:</span> <span className="font-medium">{unit.leaseTermMonths} months</span></div>}
              {unit.lastPaidDate && <div><span className="text-muted-foreground">Last Paid:</span> <span className="font-medium">{unit.lastPaidDate}</span></div>}
              {unit.parking != null && unit.parking !== 0 && <div><span className="text-muted-foreground">Parking:</span> <span className="font-medium">${unit.parking.toLocaleString()}</span></div>}
              {unit.petRent != null && unit.petRent !== 0 && <div><span className="text-muted-foreground">Pet Rent:</span> <span className="font-medium">${unit.petRent.toLocaleString()}</span></div>}
              {unit.subsidizedRent != null && unit.subsidizedRent !== 0 && <div><span className="text-muted-foreground">Subsidized Rent:</span> <span className="font-medium">${unit.subsidizedRent.toLocaleString()}</span></div>}
              {unit.utilityBillbacks != null && unit.utilityBillbacks !== 0 && <div><span className="text-muted-foreground">Utility Billbacks:</span> <span className="font-medium">${unit.utilityBillbacks.toLocaleString()}</span></div>}
              {unit.arrears != null && unit.arrears !== 0 && <div><span className="text-muted-foreground">Arrears:</span> <span className="font-medium text-destructive">${unit.arrears.toLocaleString()}</span></div>}
              {unit.leaseBreakFee != null && unit.leaseBreakFee !== 0 && <div><span className="text-muted-foreground">Lease Break Fee:</span> <span className="font-medium">${unit.leaseBreakFee.toLocaleString()}</span></div>}
              {unit.concession != null && unit.concession !== 0 && <div><span className="text-muted-foreground">Concession:</span> <span className="font-medium">${unit.concession.toLocaleString()}</span></div>}
              {unit.moveInSpecials && <div className="col-span-2"><span className="text-muted-foreground">Move-in Specials:</span> <span className="font-medium">{unit.moveInSpecials}</span></div>}
            </div>
            {unit.notes && <p className="text-sm text-muted-foreground border-t pt-2 mt-2">{unit.notes}</p>}
          </CardContent>
        </Card>
      )}

      {/* Floor Plans & Documents */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-foreground">Floor Plans & Documents</h3>
            <Button variant="outline" size="sm" onClick={handleDocUpload} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              Upload
            </Button>
          </div>
          {documents.length === 0 && !uploading && (
            <p className="text-sm text-muted-foreground">No documents uploaded yet. Upload floor plans, PDFs, or spreadsheets.</p>
          )}
          <div className="space-y-2">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 rounded-lg border p-2.5 text-sm">
                {docIcon(doc.fileType)}
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 min-w-0 truncate text-foreground hover:underline"
                >
                  {doc.fileName}
                </a>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-destructive" onClick={() => handleDeleteDoc(doc.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Tasks ({unitTasks.length})</h3>
        {unitTasks.length === 0 && (
          <p className="text-sm text-muted-foreground">No tasks assigned to this unit.</p>
        )}
        <div className="space-y-3">
          {unitTasks.map((task) => {
            const vendor = vendors[task.vendorId];
            const progress = getProgress(task.id);
            return (
              <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setReviewTask(task)}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{task.name}</p>
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => { e.stopPropagation(); setReviewTask(task); }} title="View details">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={statusColor(task.status)}>{task.status}</Badge>
                    <Badge variant="outline" className={
                      task.priority === "High" ? "border-destructive/30 text-destructive" : ""
                    }>{task.priority}</Badge>
                    {vendor && <Badge variant="secondary">{vendor.name}</Badge>}
                  </div>

                  <div className="flex items-center gap-2">
                    <Progress value={progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground">{progress}%</span>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {task.checklist.filter((c) => c.checked).length}/{task.checklist.length} items completed
                  </div>

                  {task.photos.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Camera className="h-3.5 w-3.5" /> {task.photos.length} proof photo(s)
                    </div>
                  )}

                  {task.issues.length > 0 && (
                    <p className="text-xs text-destructive font-medium">{task.issues.length} issue(s) reported</p>
                  )}

                  {task.status === "Completed" && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" /> Awaiting your review
                    </div>
                  )}
                  {task.status === "Approved" && (
                    <div className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
                      <CheckCircle2 className="h-4 w-4" /> Approved
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <PMTaskReviewDialog
        task={reviewTask}
        open={!!reviewTask}
        onOpenChange={(open) => { if (!open) setReviewTask(null); }}
      />
    </div>
  );
};

export default PMUnitDetail;
