import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTaskState } from "@/context/TaskContext";
import { useAuth } from "@/hooks/useAuth";
import { statusColor } from "@/lib/statusColor";
import {
  MapPin, ChevronRight, CalendarDays, CheckCircle2,
  CircleDot, Circle,
} from "lucide-react";

const VendorDashboard = () => {
  const navigate = useNavigate();
  const { tasks, units, getProgress } = useTaskState();
  const { user } = useAuth();

  // Build flat task list - vendor sees all their assigned tasks
  const allTasks = Object.values(tasks).map((task) => ({
    task,
    unit: units[task.unitId],
  })).filter(({ unit }) => !!unit);

  // Separate by actionability
  const todoTasks = allTasks.filter(
    ({ task }) => task.status === "Not Started" || task.status === "In Progress" || task.status === "Rework"
  );
  const doneTasks = allTasks.filter(
    ({ task }) => task.status === "Completed" || task.status === "Approved"
  );

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "there";

  return (
    <div className="min-h-screen bg-background">
      {/* Friendly header */}
      <header className="border-b bg-background px-5 py-5">
        <p className="text-base text-muted-foreground">👋 Hi {firstName},</p>
        <h1 className="text-lg font-semibold text-foreground mt-0.5">
          {todoTasks.length === 0
            ? "You're all caught up!"
            : `You have ${todoTasks.length} task${todoTasks.length !== 1 ? "s" : ""} to do`}
        </h1>
      </header>

      <main className="px-4 py-5 space-y-6 max-w-lg mx-auto">
        {/* To-do section */}
        {todoTasks.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide px-1">
              To Do
            </h2>
            {todoTasks.map(({ task, unit }) => {
              const progress = getProgress(task.id);
              const isRework = task.status === "Rework";
              return (
                <button
                  key={task.id}
                  className="w-full text-left rounded-xl border bg-card p-4 space-y-3 active:scale-[0.98] transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
                  onClick={() => navigate(`/unit/${unit.id}/task/${task.id}`)}
                >
                  {/* Task name + arrow */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <p className="font-semibold text-base text-foreground leading-tight">
                        {task.name}
                      </p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        Unit {unit.unitNumber} · {unit.propertyName}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                  </div>

                  {/* Status + due date */}
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={`text-xs ${statusColor(task.status)} ${isRework ? "animate-pulse" : ""}`}
                    >
                      {isRework ? "⚠ Needs Rework" : task.status}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Due {task.dueDate}
                    </span>
                  </div>

                  {/* Simple progress */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{progress}% done</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </button>
              );
            })}
          </section>
        )}

        {/* Done section */}
        {doneTasks.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide px-1">
              Done ✓
            </h2>
            {doneTasks.map(({ task, unit }) => (
              <button
                key={task.id}
                className="w-full text-left rounded-xl border bg-card/60 p-4 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-ring"
                onClick={() => navigate(`/unit/${unit.id}/task/${task.id}`)}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-foreground/70 line-through decoration-1">
                        {task.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Unit {unit.unitNumber}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs ${statusColor(task.status)}`}>
                    {task.status}
                  </Badge>
                </div>
              </button>
            ))}
          </section>
        )}

        {/* Empty state */}
        {allTasks.length === 0 && (
          <div className="text-center py-12 space-y-2">
            <Circle className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-muted-foreground">No tasks assigned yet</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default VendorDashboard;
