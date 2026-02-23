/**
 * Static vendor task detail for demo — no backend. Uses DemoVendorContext.
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDemoVendor } from "@/context/DemoVendorContext";
import * as TaskService from "@backend/services/taskService";
import TaskStatusBanner from "@/components/task/TaskStatusBanner";
import TaskChecklist from "@/components/task/TaskChecklist";
import AIChatDialog from "@/components/task/AIChatDialog";
import ReportIssueDialog from "@/components/task/ReportIssueDialog";
import SubmissionHistoryDialog from "@/components/task/SubmissionHistoryDialog";
import { TaskPhotos, TaskIssuesList } from "@/components/task/TaskSharedWidgets";
import {
  ArrowLeft,
  Clock,
  CalendarDays,
  AlertTriangle,
  Camera,
  MessageCircle,
  CheckCircle2,
  History,
  Info,
  Phone,
  MapPin,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

const VendorDemoTaskDetail = () => {
  const { unitId, taskId } = useParams<{ unitId: string; taskId: string }>();
  const navigate = useNavigate();
  const { tasks, toggleChecklistItem, addPhoto, addIssue, completeTask } =
    useDemoVendor();
  const task = taskId ? tasks[taskId] : undefined;

  const [aiOpen, setAiOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!task) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-foreground">Task not found</h1>
          <Button onClick={() => navigate("/vendor-demo")}>
            Back to Demo Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const isCompleted = TaskService.isTerminalStatus(task);
  const canSubmit = TaskService.canComplete(task);
  const checkedCount = TaskService.getCheckedCount(task);
  const submissions = task.submissionHistory ?? [];

  const handlePhotoUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = () => {
      const files = input.files;
      if (!files) return;
      for (const file of Array.from(files)) {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          addPhoto(task.id, dataUrl);
          toast({
            title: "Photo added (demo)",
            description: `${file.name} — stored locally only.`,
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleComplete = () => {
    completeTask(task.id);
    toast({
      title: "Task marked complete (demo)",
      description: "State updated locally. No backend.",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
          Demo mode · No backend
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 mb-1"
          onClick={() => navigate("/vendor-demo")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <h1 className="text-lg font-bold text-foreground">{task.name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {task.estimatedDuration}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            Due {task.dueDate}
          </span>
          <Badge
            variant="outline"
            className={
              task.priority === "High"
                ? "border-destructive/30 text-destructive"
                : ""
            }
          >
            {task.priority}
          </Badge>
          <span className="inline-flex items-center gap-1 font-medium text-primary ml-auto">
            <Phone className="h-3 w-3" /> Contact PM
          </span>
        </div>
      </header>

      <main className="px-4 py-4 space-y-5 max-w-lg mx-auto">
        <TaskStatusBanner task={task} />
        <TaskChecklist task={task} onToggle={toggleChecklistItem} />

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2 flex items-center gap-1">
            <Info className="h-4 w-4" /> Specifications
          </h2>
          <Card>
            <CardContent className="p-3 space-y-2">
              {task.specifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">None</p>
              ) : (
                task.specifications.map((spec, i) => (
                  <p key={i} className="text-sm text-foreground">
                    • {spec}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            onClick={() => setAiOpen(true)}
          >
            <MessageCircle className="h-5 w-5 mr-2" /> Ask AI for Help
          </Button>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            Proof Photos
          </h2>
          <TaskPhotos photos={task.photos} />
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            onClick={handlePhotoUpload}
            disabled={isCompleted}
          >
            <Camera className="h-5 w-5 mr-2" /> Take / Upload Photo (demo)
          </Button>
        </section>

        {submissions.length > 0 && (
          <section>
            <Button
              variant="outline"
              className="w-full h-12 text-base"
              onClick={() => setHistoryOpen(true)}
            >
              <History className="h-5 w-5 mr-2" /> View Previous Submissions (
              {submissions.length})
            </Button>
          </section>
        )}

        <TaskIssuesList issues={task.issues} />

        <Button
          variant="outline"
          className="w-full h-12 text-base border-destructive/30 text-destructive hover:bg-destructive/5"
          onClick={() => setIssueOpen(true)}
          disabled={isCompleted}
        >
          <AlertTriangle className="h-5 w-5 mr-2" /> Report an Issue
        </Button>

        {!isCompleted && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>Demo: location is not required to submit.</span>
          </div>
        )}

        <Button
          className="w-full h-14 text-base font-semibold"
          disabled={!canSubmit}
          onClick={handleComplete}
        >
          <CheckCircle2 className="h-5 w-5 mr-2" /> Mark Task Complete
        </Button>
        {!isCompleted && (
          <p className="text-xs text-center text-muted-foreground -mt-3">
            {checkedCount < task.checklist.length &&
              "Complete all checklist items"}
            {checkedCount < task.checklist.length &&
              task.photos.length === 0 &&
              " and "}
            {task.photos.length === 0 &&
              "upload at least one proof photo"}
            {checkedCount === task.checklist.length &&
              task.photos.length > 0 &&
              "Ready to submit!"}
          </p>
        )}
      </main>

      <AIChatDialog open={aiOpen} onOpenChange={setAiOpen} />
      <ReportIssueDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        onSubmit={(issue) => addIssue(task.id, issue)}
      />
      <SubmissionHistoryDialog
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        submissions={submissions}
      />
    </div>
  );
};

export default VendorDemoTaskDetail;
