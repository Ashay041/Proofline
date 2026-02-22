import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CheckCircle2, ImageIcon } from "lucide-react";
import type { TaskSubmission } from "@/types";

interface SubmissionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissions: TaskSubmission[];
}

const SubmissionHistoryDialog = ({ open, onOpenChange, submissions }: SubmissionHistoryDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Previous Submissions</DialogTitle>
        <DialogDescription>Audit trail of past submissions and rework requests.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        {submissions.map((sub, idx) => (
          <div key={idx} className="rounded border p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">Submission #{idx + 1}</p>
              <span className="text-xs text-muted-foreground">
                {new Date(sub.submittedAt).toLocaleDateString()}
              </span>
            </div>

            {/* Checklist snapshot */}
            <div className="space-y-1">
              {sub.checklist.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-xs">
                  {c.checked ? (
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  ) : (
                    <div className="h-3 w-3 rounded-sm border border-muted-foreground/30" />
                  )}
                  <span className={c.checked ? "text-muted-foreground" : "text-foreground"}>{c.label}</span>
                </div>
              ))}
            </div>

            {/* Photos grid */}
            {sub.photos.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> {sub.photos.length} photo{sub.photos.length !== 1 ? "s" : ""} submitted
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {sub.photos.map((photo, pIdx) => (
                    <div
                      key={pIdx}
                      className="aspect-square rounded bg-muted border flex items-center justify-center overflow-hidden"
                    >
                      {photo.startsWith("http") || photo.startsWith("data:") ? (
                        <img src={photo} alt={`Submission ${idx + 1} photo ${pIdx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
                          <ImageIcon className="h-5 w-5" />
                          <span className="text-[10px]">Photo {pIdx + 1}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sub.photos.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No photos were submitted</p>
            )}

            {/* Rework info */}
            {sub.reworkItems && sub.reworkItems.length > 0 && (
              <div className="rounded bg-orange-50 border border-orange-200 p-2 space-y-1">
                <p className="text-xs font-medium text-orange-700">Rework requested on:</p>
                {sub.reworkItems.map((ri) => {
                  const item = sub.checklist.find((c) => c.id === ri.checklistItemId);
                  return (
                    <div key={ri.checklistItemId} className="text-xs text-orange-800">
                      • {item?.label || ri.checklistItemId}
                      {ri.note && <span className="text-orange-600"> — {ri.note}</span>}
                    </div>
                  );
                })}
                {sub.reworkNote && (
                  <p className="text-xs text-orange-700 mt-1">Note: {sub.reworkNote}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </DialogContent>
  </Dialog>
);

export default SubmissionHistoryDialog;
