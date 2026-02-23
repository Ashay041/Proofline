import { CheckCircle2, RotateCcw } from "lucide-react";
import type { Task } from "@backend/types";

interface TaskStatusBannerProps {
  task: Task;
}

const TaskStatusBanner = ({ task }: TaskStatusBannerProps) => {
  if (task.status === "Approved") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-500/10 p-4 flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
        <div>
          <p className="font-semibold text-emerald-700">Task Approved</p>
          <p className="text-sm text-emerald-600">The Property Manager has approved this task.</p>
        </div>
      </div>
    );
  }

  if (task.status === "Completed") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-500/10 p-4 flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
        <div>
          <p className="font-semibold text-emerald-700">Task Complete</p>
          <p className="text-sm text-emerald-600">Awaiting Property Manager review.</p>
        </div>
      </div>
    );
  }

  if (task.status === "Rework") {
    return (
      <div className="rounded-lg border border-orange-200 bg-orange-500/10 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-orange-600 shrink-0" />
          <p className="font-semibold text-orange-700">Rework Required</p>
        </div>
        {task.reworkNote && (
          <p className="text-sm text-orange-800 bg-orange-100 rounded p-2">{task.reworkNote}</p>
        )}
        <div className="space-y-2">
          <p className="text-xs font-medium text-orange-700">Items to fix:</p>
          {(task.reworkItems ?? []).map((ri) => {
            const item = task.checklist.find((c) => c.id === ri.checklistItemId);
            if (!item) return null;
            return (
              <div key={ri.checklistItemId} className="rounded border border-orange-200 bg-white p-2 space-y-1">
                <p className="text-sm font-medium text-foreground">• {item.label}</p>
                {ri.note && <p className="text-xs text-orange-700 bg-orange-50 rounded p-1.5">{ri.note}</p>}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-orange-600">Please address the items above, then resubmit.</p>
      </div>
    );
  }

  return null;
};

export default TaskStatusBanner;
