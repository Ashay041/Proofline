import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import SubmissionHistoryDialog from "@/components/task/SubmissionHistoryDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { type Task, type ReworkItem } from "@backend/types";
import { useAppState } from "@/context/TaskContext";
import {
  CheckCircle2, RotateCcw, Camera, AlertTriangle, Image as ImageIcon,
  Clock, CalendarDays, Info, History, Phone, ChevronLeft, ChevronRight, MapPin, ExternalLink
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import * as TaskService from "@backend/services/taskService";

interface PMTaskReviewDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

import { statusColor } from "@backend/lib/statusColor";

const PMTaskReviewDialog = ({ task, open, onOpenChange }: PMTaskReviewDialogProps) => {
  const { updateTask, requestRework: doRework, vendors, units, getProgress } = useAppState();
  const [reworkMode, setReworkMode] = useState(false);
  const [reworkNote, setReworkNote] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  if (!task) return null;

  const vendor = vendors[task.vendorId];
  const unit = units[task.unitId];
  const submissions = task.submissionHistory ?? [];
  const latestSubmission = submissions.length > 0 ? submissions[submissions.length - 1] : null;
  // After vendor submits, task.photos is cleared; show from latest submission instead
  const reviewPhotos = task.photos.length > 0 ? task.photos : (latestSubmission?.photos ?? []);
  const reviewChecklist = latestSubmission?.checklist ?? task.checklist;
  const progress = reviewChecklist.length > 0
    ? Math.round((reviewChecklist.filter(c => c.checked).length / reviewChecklist.length) * 100)
    : 0;
  const checkedCount = reviewChecklist.filter((c) => c.checked).length;
  const isResubmission = TaskService.isReworkResubmission(task);
  const attemptNumber = TaskService.getSubmissionAttempt(task);
  const lastReworkItems = TaskService.getLastReworkItems(task);
  const lastReworkNote = TaskService.getLastReworkNote(task);
  const lastReworkIds = new Set(lastReworkItems.map((r) => r.checklistItemId));
  const lastReworkNotes: Record<string, string> = {};
  lastReworkItems.forEach((r) => { if (r.note) lastReworkNotes[r.checklistItemId] = r.note; });

  const toggleItemForRework = (itemId: string) => {
    setSelectedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleApprove = async () => {
    try {
      await updateTask(task.id, { status: "Approved", reworkNote: undefined, reworkItems: undefined });
      toast({ title: "Task approved", description: "Status updated." });
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Failed to approve", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    }
  };

  const handleRequestRework = async () => {
    const flaggedItems = Object.entries(selectedItems).filter(([, v]) => v);
    if (flaggedItems.length === 0) {
      toast({ title: "Select items", description: "Please select at least one checklist item that needs rework." });
      return;
    }

    const reworkItems: ReworkItem[] = flaggedItems.map(([id]) => ({
      checklistItemId: id,
      note: itemNotes[id] || "",
    }));

    try {
      await doRework(task.id, reworkItems, reworkNote.trim() || undefined);
      toast({ title: "Rework requested", description: `${flaggedItems.length} item(s) flagged for rework.` });
      resetState();
      onOpenChange(false);
    } catch (e) {
      toast({ title: "Failed to request rework", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
    }
  };

  const resetState = () => {
    setReworkMode(false);
    setReworkNote("");
    setSelectedItems({});
    setItemNotes({});
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.name}
            {isResubmission && (
              <Badge className="bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100 text-xs">
                <RotateCcw className="h-3 w-3 mr-1" /> Rework Resubmission
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{task.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* Meta info */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={statusColor(task.status)}>{task.status}</Badge>
            <Badge variant="outline" className={
              task.priority === "High" ? "border-destructive/30 text-destructive" : ""
            }>{task.priority}</Badge>
            {unit && <Badge variant="outline">Unit {unit.unitNumber}</Badge>}
            {vendor && <Badge variant="secondary">{vendor.name}</Badge>}
            {vendor?.phone && (
              <a href={`tel:${vendor.phone}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                <Phone className="h-3 w-3" /> {vendor.phone}
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{task.estimatedDuration}</span>
            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />Due {task.dueDate}</span>
          </div>

          {/* Checklist - with rework selection in rework mode */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">Checklist</h3>
              <span className="text-xs text-muted-foreground">{checkedCount}/{reviewChecklist.length}</span>
            </div>
            <Progress value={progress} className="h-2 mb-2" />
            {reworkMode && (
              <p className="text-xs text-orange-600 mb-2">Select the items that need rework:</p>
            )}
            <div className="space-y-1.5">
              {/* If resubmission, show rework items first */}
              {isResubmission && (
                <>
                  <p className="text-xs font-medium text-orange-700 mb-1">🔄 Reworked Items:</p>
                  {reviewChecklist
                    .filter((item) => lastReworkIds.has(item.id))
                    .map((item) => (
                      <div key={item.id} className={`rounded border-2 border-orange-300 bg-orange-50 p-2 space-y-1.5 ${reworkMode && selectedItems[item.id] ? "ring-2 ring-orange-400" : ""}`}>
                        <div className="flex items-center gap-2 text-sm">
                          {reworkMode ? (
                            <Checkbox checked={!!selectedItems[item.id]} onCheckedChange={() => toggleItemForRework(item.id)} className="h-4 w-4" />
                          ) : item.checked ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                          ) : (
                            <div className="h-4 w-4 rounded-sm border border-muted-foreground/30 shrink-0" />
                          )}
                          <span className={item.checked && !reworkMode ? "text-muted-foreground line-through" : "text-foreground font-medium"}>
                            {item.label}
                          </span>
                          <Badge variant="outline" className="ml-auto text-[10px] border-orange-300 text-orange-600">reworked</Badge>
                        </div>
                        {lastReworkNotes[item.id] && (
                          <p className="text-xs text-orange-600 ml-6 italic">Previous note: "{lastReworkNotes[item.id]}"</p>
                        )}
                        {reworkMode && selectedItems[item.id] && (
                          <Textarea value={itemNotes[item.id] || ""} onChange={(e) => setItemNotes((prev) => ({ ...prev, [item.id]: e.target.value }))} rows={2} placeholder="What needs to be fixed for this item?" className="text-xs" />
                        )}
                      </div>
                    ))}

                  {reviewChecklist.some((item) => !lastReworkIds.has(item.id)) && (
                    <p className="text-xs font-medium text-muted-foreground mt-3 mb-1">Other Items:</p>
                  )}
                </>
              )}

              {/* Non-rework items (or all items if not a resubmission) */}
              {reviewChecklist
                .filter((item) => !isResubmission || !lastReworkIds.has(item.id))
                .map((item) => (
                  <div key={item.id} className={`rounded border p-2 space-y-1.5 ${reworkMode && selectedItems[item.id] ? "border-orange-300 bg-orange-50" : ""}`}>
                    <div className="flex items-center gap-2 text-sm">
                      {reworkMode ? (
                        <Checkbox checked={!!selectedItems[item.id]} onCheckedChange={() => toggleItemForRework(item.id)} className="h-4 w-4" />
                      ) : item.checked ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <div className="h-4 w-4 rounded-sm border border-muted-foreground/30 shrink-0" />
                      )}
                      <span className={item.checked && !reworkMode ? "text-muted-foreground line-through" : "text-foreground"}>
                        {item.label}
                      </span>
                    </div>
                    {reworkMode && selectedItems[item.id] && (
                      <Textarea value={itemNotes[item.id] || ""} onChange={(e) => setItemNotes((prev) => ({ ...prev, [item.id]: e.target.value }))} rows={2} placeholder="What needs to be fixed for this item?" className="text-xs" />
                    )}
                  </div>
                ))}
            </div>
          </section>

          {/* Specifications */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
              <Info className="h-3.5 w-3.5" /> Specifications
            </h3>
            <div className="rounded border p-3 space-y-1">
              {task.specifications.map((spec, i) => (
                <p key={i} className="text-sm text-foreground">• {spec}</p>
              ))}
            </div>
          </section>

          {/* Submission location (latest submission with geo) */}
          {(task.submissionHistory ?? []).length > 0 && (() => {
            const latest = task.submissionHistory![task.submissionHistory!.length - 1];
            if (latest.geoLat == null || latest.geoLng == null) return null;
            const mapUrl = `https://www.google.com/maps?q=${latest.geoLat},${latest.geoLng}`;
            return (
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> Submission location
                </h3>
                <div className="rounded border p-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {latest.geoLat.toFixed(5)}, {latest.geoLng.toFixed(5)}
                  </span>
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    View on map <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </section>
            );
          })()}

          {/* Proof Photos */}
          <section>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
              <Camera className="h-3.5 w-3.5" /> Proof Photos ({reviewPhotos.length})
            </h3>
            {reviewPhotos.length === 0 ? (
              <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {reviewPhotos.map((photo, i) => (
                  <div
                    key={i}
                    className="relative aspect-square rounded-lg bg-muted flex items-center justify-center border cursor-pointer overflow-hidden transition-all hover:ring-2 hover:ring-primary/50 hover:scale-105"
                    onClick={() => setSelectedPhotoIndex(i)}
                  >
                    {photo.startsWith("data:") || photo.startsWith("http") ? (
                      <img src={photo} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    )}
                    <span className="absolute bottom-1 right-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                      {i + 1} of {reviewPhotos.length}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Issues */}
          {task.issues.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Reported Issues ({task.issues.length})
              </h3>
              <div className="space-y-2">
                {task.issues.map((issue) => (
                  <div key={issue.id} className="flex items-start gap-2 rounded border border-destructive/20 bg-destructive/5 p-2">
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{issue.title}</p>
                      {issue.description && <p className="text-xs text-muted-foreground">{issue.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Previous Submissions */}
          {(task.submissionHistory ?? []).length > 0 && (
            <section>
              <Button variant="outline" className="w-full" onClick={() => setHistoryOpen(true)}>
                <History className="h-4 w-4 mr-2" /> View Previous Submissions ({(task.submissionHistory ?? []).length})
              </Button>
            </section>
          )}

          {/* Rework note if already in rework */}
          {task.status === "Rework" && task.reworkNote && (
            <div className="rounded border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
              <span className="font-medium">Previous rework note:</span> {task.reworkNote}
            </div>
          )}

          {/* Actions */}
          {task.status === "Completed" && !reworkMode && (
            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleApprove}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
              </Button>
              <Button variant="outline" className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50" onClick={() => setReworkMode(true)}>
                <RotateCcw className="h-4 w-4 mr-1" /> Request Rework
              </Button>
            </div>
          )}

          {reworkMode && (
            <div className="space-y-3 pt-2 border-t">
              <h3 className="text-sm font-semibold text-orange-700">Request Rework</h3>
              <p className="text-xs text-muted-foreground">Select specific checklist items above, then optionally add a general note below.</p>
              <Textarea
                value={reworkNote}
                onChange={(e) => setReworkNote(e.target.value)}
                rows={2}
                placeholder="Optional general note for the vendor..."
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={resetState}>Cancel</Button>
                <Button variant="destructive" size="sm" onClick={handleRequestRework}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Submit Rework ({Object.values(selectedItems).filter(Boolean).length} items)
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
    <SubmissionHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} submissions={task.submissionHistory ?? []} />

    {/* Photo Lightbox */}
    <Dialog open={selectedPhotoIndex !== null} onOpenChange={(open) => { if (!open) setSelectedPhotoIndex(null); }}>
      <DialogContent className="max-w-3xl bg-black/95 border-none p-2 sm:p-4">
        <DialogHeader className="sr-only">
          <DialogTitle>Photo {selectedPhotoIndex !== null ? selectedPhotoIndex + 1 : ""} of {reviewPhotos.length}</DialogTitle>
          <DialogDescription>Viewing proof photo</DialogDescription>
        </DialogHeader>
        {selectedPhotoIndex !== null && (
          <div className="relative flex items-center justify-center min-h-[50vh]">
            <img
              src={reviewPhotos[selectedPhotoIndex]}
              alt={`Photo ${selectedPhotoIndex + 1}`}
              className="max-h-[75vh] max-w-full object-contain rounded"
            />
            {reviewPhotos.length > 1 && (
              <>
                <button
                  onClick={() => setSelectedPhotoIndex((selectedPhotoIndex - 1 + reviewPhotos.length) % reviewPhotos.length)}
                  className="absolute left-1 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 rounded-full p-1.5 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={() => setSelectedPhotoIndex((selectedPhotoIndex + 1) % reviewPhotos.length)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 rounded-full p-1.5 transition-colors"
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>
              </>
            )}
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-white/80 bg-black/50 px-2 py-1 rounded">
              Photo {selectedPhotoIndex + 1} of {reviewPhotos.length}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default PMTaskReviewDialog;
