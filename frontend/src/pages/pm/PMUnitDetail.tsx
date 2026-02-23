import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAppState } from "@/context/TaskContext";
import { type Task } from "@backend/types";
import { ArrowLeft, MapPin, AlertTriangle, CheckCircle2, Image as ImageIcon, Eye, Camera } from "lucide-react";
import PMTaskReviewDialog from "@/components/PMTaskReviewDialog";

import { statusColor } from "@backend/lib/statusColor";

const PMUnitDetail = () => {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const { units, tasks, vendors, getProgress } = useAppState();
  const unit = unitId ? units[unitId] : undefined;
  const [reviewTask, setReviewTask] = useState<Task | null>(null);

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
