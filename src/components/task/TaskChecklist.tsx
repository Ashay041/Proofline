import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import type { Task } from "@/types";
import { getReworkItemIds, getReworkItemNotes, getReworkProgress, getCheckedCount, getProgress } from "@/services/taskService";

interface TaskChecklistProps {
  task: Task;
  onToggle: (taskId: string, itemId: string) => void;
}

const TaskChecklist = ({ task, onToggle }: TaskChecklistProps) => {
  const isRework = task.status === "Rework";
  const isCompleted = task.status === "Completed" || task.status === "Approved";
  const reworkItemIds = getReworkItemIds(task);
  const reworkNotes = getReworkItemNotes(task);

  if (isRework) {
    const reworkItems = task.checklist.filter((item) => reworkItemIds.has(item.id));
    const reworkChecked = reworkItems.filter((c) => c.checked).length;
    const progress = getReworkProgress(task);

    return (
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold text-foreground">Rework Items</h2>
          <span className="text-sm text-muted-foreground">{reworkChecked}/{reworkItemIds.size}</span>
        </div>
        <Progress value={progress} className="h-2 mb-3" />
        <div className="space-y-2">
          {reworkItems.map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-3 rounded-lg border border-orange-300 bg-orange-50 p-3 cursor-pointer active:bg-muted/50 transition-colors"
            >
              <Checkbox
                checked={item.checked}
                onCheckedChange={() => onToggle(task.id, item.id)}
                className="mt-0.5 h-5 w-5"
              />
              <div className="space-y-1">
                <span className={`text-sm ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {item.label}
                </span>
                {reworkNotes[item.id] && (
                  <p className="text-xs text-orange-700">PM note: {reworkNotes[item.id]}</p>
                )}
              </div>
            </label>
          ))}
        </div>
      </section>
    );
  }

  const checkedCount = getCheckedCount(task);
  const progress = getProgress(task);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-semibold text-foreground">Checklist</h2>
        <span className="text-sm text-muted-foreground">{checkedCount}/{task.checklist.length}</span>
      </div>
      <Progress value={progress} className="h-2 mb-3" />
      <div className="space-y-2">
        {task.checklist.map((item) => (
          <label
            key={item.id}
            className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer active:bg-muted/50 transition-colors"
          >
            <Checkbox
              checked={item.checked}
              onCheckedChange={() => onToggle(task.id, item.id)}
              className="mt-0.5 h-5 w-5"
              disabled={isCompleted}
            />
            <div className="space-y-1">
              <span className={`text-sm ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                {item.label}
              </span>
            </div>
          </label>
        ))}
      </div>
    </section>
  );
};

export default TaskChecklist;
