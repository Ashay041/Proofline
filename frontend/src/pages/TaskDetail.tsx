/**
 * TaskDetail — Vendor's task view.
 *
 * SRP: orchestrates sub-components; no business logic inline.
 * Composition: delegates to TaskStatusBanner, TaskChecklist,
 *   AIChatDialog, ReportIssueDialog, SubmissionHistoryDialog.
 */
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTaskState, useAppState } from "@/context/TaskContext";
import * as TaskService from "@backend/services/taskService";
import TaskStatusBanner from "@/components/task/TaskStatusBanner";
import TaskChecklist from "@/components/task/TaskChecklist";
import AIChatDialog from "@/components/task/AIChatDialog";
import ReportIssueDialog from "@/components/task/ReportIssueDialog";
import SubmissionHistoryDialog from "@/components/task/SubmissionHistoryDialog";
import { TaskPhotos, TaskIssuesList } from "@/components/task/TaskSharedWidgets";
import type { UnitDocument } from "@backend/types";
import {
  ArrowLeft, Clock, CalendarDays, AlertTriangle, Camera,
  MessageCircle, CheckCircle2, History, Info, MapPin,
  FileText, FileSpreadsheet, ImageIcon, Home, DollarSign,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

function unitDocIcon(fileType: string) {
  if (fileType === "image") return <ImageIcon className="h-4 w-4 shrink-0 text-muted-foreground" />;
  if (fileType === "pdf") return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />;
  return <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

const TaskDetail = () => {
  const { unitId, taskId } = useParams<{ unitId: string; taskId: string }>();
  const navigate = useNavigate();
  const { tasks, toggleChecklistItem, addPhoto, addIssue, completeTask, fetchUnitDocuments } = useTaskState();
  const { units } = useAppState();
  const task = taskId ? tasks[taskId] : undefined;
  const unit = task?.unitId ? units[task.unitId] : undefined;

  const [aiOpen, setAiOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [unitDocs, setUnitDocs] = useState<UnitDocument[]>([]);

  useEffect(() => {
    if (!task?.unitId) return;
    fetchUnitDocuments(task.unitId).then(setUnitDocs).catch(() => {});
  }, [task?.unitId, fetchUnitDocuments]);

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-foreground">Task not found</h1>
          <Button onClick={() => navigate("/vendor")}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  const isCompleted = TaskService.isTerminalStatus(task);
  const canSubmit = TaskService.canComplete(task);
  const checkedCount = TaskService.getCheckedCount(task);
  const submissions = task.submissionHistory ?? [];

  const handlePhotoUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.multiple = true;
    input.onchange = async () => {
      const files = input.files;
      if (!files) return;
      const { uploadTaskPhoto } = await import("@backend/lib/supabaseStorage");
      for (const file of Array.from(files)) {
        try {
          const url = await uploadTaskPhoto(task.id, file);
          addPhoto(task.id, url);
          toast({ title: "Photo uploaded", description: `${file.name} added.` });
        } catch (err: any) {
          toast({ title: "Upload failed", description: err.message });
        }
      }
    };
    input.click();
  };

  const handleComplete = () => {
    if (!navigator.geolocation) {
      toast({ title: "Location required", description: "Your browser does not support location. You need location access to submit." });
      return;
    }
    const geoOptions: PositionOptions = { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 };
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await completeTask(task.id, { geoLat: position.coords.latitude, geoLng: position.coords.longitude });
          toast({ title: "Task marked as complete", description: "Awaiting Property Manager review." });
        } catch (e) {
          toast({ title: "Failed to submit", description: e instanceof Error ? e.message : "Please try again.", variant: "destructive" });
        }
      },
      () => {
        toast({ title: "Location required", description: "Location access is required to submit. Please enable location and try again." });
      },
      geoOptions
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <Button variant="ghost" size="sm" className="-ml-2 mb-1" onClick={() => navigate("/vendor")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-lg font-bold text-foreground">{task.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{task.estimatedDuration}</span>
          <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />Due {task.dueDate}</span>
          <Badge variant="outline" className={
            task.priority === "High" ? "border-destructive/30 text-destructive" : ""
          }>{task.priority}</Badge>
          {task.pmName && (
            <span className="inline-flex items-center gap-1">
              Assigned by <strong>{task.pmName}</strong>
            </span>
          )}
        </div>
      </header>

      <main className="px-4 py-4 space-y-5 max-w-lg mx-auto">
        {/* Status banner (approved / completed / rework) */}
        <TaskStatusBanner task={task} />

        {/* Checklist (auto-switches between normal and rework mode) */}
        <TaskChecklist task={task} onToggle={toggleChecklistItem} />

        {/* Specifications */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2 flex items-center gap-1">
            <Info className="h-4 w-4" /> Specifications
          </h2>
          <Card>
            <CardContent className="p-3 space-y-2">
              {task.specifications.map((spec, i) => (
                <p key={i} className="text-sm text-foreground">• {spec}</p>
              ))}
            </CardContent>
          </Card>
        </section>

        {/* Unit Info Package — only physical details relevant to the vendor */}
        {unit && (unit.unitType || unit.sqFt) && (
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2 flex items-center gap-1">
              <Home className="h-4 w-4" /> Unit Details
            </h2>
            <Card>
              <CardContent className="p-3">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                  {unit.unitType && <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{unit.unitType}</span></div>}
                  {unit.sqFt != null && <div><span className="text-muted-foreground">Sq Ft:</span> <span className="font-medium">{unit.sqFt.toLocaleString()}</span></div>}
                </div>
                {unit.notes && <p className="text-sm text-muted-foreground border-t pt-2 mt-2">{unit.notes}</p>}
              </CardContent>
            </Card>
          </section>
        )}

        {/* Unit Documents (floor plans, etc.) */}
        {unitDocs.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-foreground mb-2 flex items-center gap-1">
              <FileText className="h-4 w-4" /> Floor Plans & Documents
            </h2>
            <Card>
              <CardContent className="p-3 space-y-2">
                {unitDocs.map(doc => (
                  <a
                    key={doc.id}
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2.5 rounded-lg border p-2.5 text-sm hover:bg-muted/50 transition-colors"
                  >
                    {unitDocIcon(doc.fileType)}
                    <span className="flex-1 min-w-0 truncate text-foreground">{doc.fileName}</span>
                    <span className="text-xs text-muted-foreground shrink-0">View</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          </section>
        )}

        {/* AI Help */}
        <section>
          <Button variant="outline" className="w-full h-12 text-base" onClick={() => setAiOpen(true)}>
            <MessageCircle className="h-5 w-5 mr-2" /> Ask AI for Help
          </Button>
        </section>

        {/* Photos */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">Proof Photos</h2>
          <TaskPhotos photos={task.photos} />
          <Button variant="outline" className="w-full h-12 text-base" onClick={handlePhotoUpload} disabled={isCompleted}>
            <Camera className="h-5 w-5 mr-2" /> Take / Upload Photo
          </Button>
        </section>

        {/* Submission History */}
        {submissions.length > 0 && (
          <section>
            <Button variant="outline" className="w-full h-12 text-base" onClick={() => setHistoryOpen(true)}>
              <History className="h-5 w-5 mr-2" /> View Previous Submissions ({submissions.length})
            </Button>
          </section>
        )}

        {/* Issues */}
        <TaskIssuesList issues={task.issues} />

        <Button
          variant="outline"
          className="w-full h-12 text-base border-destructive/30 text-destructive hover:bg-destructive/5"
          onClick={() => setIssueOpen(true)}
          disabled={isCompleted}
        >
          <AlertTriangle className="h-5 w-5 mr-2" /> Report an Issue
        </Button>

        {/* Geo-location notice */}
        {!isCompleted && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>When you submit, we&apos;ll use your location to verify you&apos;re at the unit.</span>
          </div>
        )}

        <Button className="w-full h-14 text-base font-semibold" disabled={!canSubmit} onClick={handleComplete}>
          <CheckCircle2 className="h-5 w-5 mr-2" /> Mark Task Complete
        </Button>
        {!isCompleted && (
          <p className="text-xs text-center text-muted-foreground -mt-3">
            {checkedCount < task.checklist.length && "Complete all checklist items"}
            {checkedCount < task.checklist.length && task.photos.length === 0 && " and "}
            {task.photos.length === 0 && "upload at least one proof photo"}
            {checkedCount === task.checklist.length && task.photos.length > 0 && "Ready to submit!"}
          </p>
        )}
      </main>

      {/* Dialogs */}
      <AIChatDialog open={aiOpen} onOpenChange={setAiOpen} />
      <ReportIssueDialog open={issueOpen} onOpenChange={setIssueOpen} onSubmit={(issue) => addIssue(task.id, issue)} />
      <SubmissionHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} submissions={submissions} />
    </div>
  );
};

export default TaskDetail;
