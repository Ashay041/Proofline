import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAppState } from "@/context/TaskContext";
import { Building2, ChevronRight, MapPin } from "lucide-react";

const PMUnits = () => {
  const navigate = useNavigate();
  const { units, tasks } = useAppState();
  const unitList = Object.values(units);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-foreground">Units</h2>

      <div className="space-y-3">
        {unitList.map((unit) => {
          const unitTasks = unit.taskIds.map((id) => tasks[id]).filter(Boolean);
          const doneCount = unitTasks.filter((t) => t.status === "Approved" || t.status === "Completed").length;
          const issues = unitTasks.reduce((sum, t) => sum + t.issues.length, 0);
          const progress = unitTasks.length ? Math.round((doneCount / unitTasks.length) * 100) : 0;

          // Derive turnover status from tasks
          const allApproved = unitTasks.length > 0 && unitTasks.every((t) => t.status === "Approved");
          const anyInProgress = unitTasks.some((t) => ["In Progress", "Rework", "Completed"].includes(t.status));
          const derivedStatus = allApproved
            ? "Complete"
            : anyInProgress
              ? "In Progress"
              : "Not Started";
          const statusStyle = allApproved
            ? "bg-emerald-500/15 text-emerald-700 border-emerald-200"
            : anyInProgress
              ? "bg-amber-500/15 text-amber-700 border-amber-200"
              : "bg-muted text-muted-foreground";

          return (
            <Card
              key={unit.id}
              className="cursor-pointer active:scale-[0.98] transition-transform"
              onClick={() => navigate(`/pm/units/${unit.id}`)}
            >
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Unit {unit.unitNumber}</p>
                      <p className="text-sm text-muted-foreground">{unit.propertyName}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {unit.address}
                </div>
                <Badge variant="outline" className={statusStyle}>
                  {derivedStatus}
                </Badge>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{unitTasks.length} task(s), {doneCount} done</span>
                  {issues > 0 && <span className="text-destructive font-medium">{issues} issue(s)</span>}
                </div>
                <Progress value={progress} className="h-1.5" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PMUnits;
