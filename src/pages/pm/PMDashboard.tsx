import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAppState } from "@/context/TaskContext";
import { useAuth } from "@/hooks/useAuth";
import { Building2, ClipboardList, Users, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  RadialBarChart, RadialBar, Legend,
} from "recharts";

const COLORS = {
  completed: "hsl(152, 44%, 38%)",
  approved: "hsl(152, 60%, 28%)",
  rework: "hsl(25, 90%, 50%)",
  inProgress: "hsl(38, 92%, 50%)",
  notStarted: "hsl(215, 12%, 70%)",
  high: "hsl(0, 72%, 51%)",
  medium: "hsl(38, 92%, 50%)",
  low: "hsl(152, 44%, 38%)",
};

const PMDashboard = () => {
  const navigate = useNavigate();
  const { tasks, units, vendors, getProgress } = useAppState();
  const { user } = useAuth();

  const taskList = Object.values(tasks);
  const unitList = Object.values(units);
  const vendorList = Object.values(vendors);

  const completedTasks = taskList.filter((t) => t.status === "Completed").length;
  const approvedTasks = taskList.filter((t) => t.status === "Approved").length;
  const reworkTasks = taskList.filter((t) => t.status === "Rework").length;
  const inProgressTasks = taskList.filter((t) => t.status === "In Progress").length;
  const notStartedTasks = taskList.filter((t) => t.status === "Not Started").length;
  const totalIssues = taskList.reduce((sum, t) => sum + t.issues.length, 0);

  // --- Chart data ---

  const taskStatusData = [
    { name: "Approved", value: approvedTasks, color: COLORS.approved },
    { name: "Completed", value: completedTasks, color: COLORS.completed },
    { name: "In Progress", value: inProgressTasks, color: COLORS.inProgress },
    { name: "Rework", value: reworkTasks, color: COLORS.rework },
    { name: "Not Started", value: notStartedTasks, color: COLORS.notStarted },
  ].filter((d) => d.value > 0);

  const priorityData = [
    { name: "High", value: taskList.filter((t) => t.priority === "High").length, color: COLORS.high },
    { name: "Medium", value: taskList.filter((t) => t.priority === "Medium").length, color: COLORS.medium },
    { name: "Low", value: taskList.filter((t) => t.priority === "Low").length, color: COLORS.low },
  ].filter((d) => d.value > 0);

  const vendorPerformance = vendorList.map((v) => {
    const vTasks = taskList.filter((t) => t.vendorId === v.id);
    const done = vTasks.filter((t) => t.status === "Completed" || t.status === "Approved").length;
    const avgProgress = vTasks.length
      ? Math.round(vTasks.reduce((s, t) => s + getProgress(t.id), 0) / vTasks.length)
      : 0;
    return {
      name: v.name.split(" ")[0],
      tasks: vTasks.length,
      completed: done,
      avgProgress,
    };
  });

  const unitProgress = unitList.map((unit) => {
    const uTasks = unit.taskIds.map((id) => tasks[id]).filter(Boolean);
    const done = uTasks.filter((t) => t.status === "Completed").length;
    const approved = uTasks.filter((t) => t.status === "Approved").length;
    const progress = uTasks.length ? Math.round(((done + approved) / uTasks.length) * 100) : 0;
    return {
      name: `Unit ${unit.unitNumber}`,
      progress,
      fill: progress === 100 ? COLORS.completed : progress > 0 ? COLORS.inProgress : COLORS.notStarted,
    };
  });

  const doneOrApproved = taskList.filter((t) => t.status === "Completed" || t.status === "Approved").length;
  const overallProgress = taskList.length
    ? Math.round((doneOrApproved / taskList.length) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Pending Review Alert */}
      {completedTasks > 0 && (
        <Card className="border-emerald-200 bg-emerald-500/10 cursor-pointer" onClick={() => navigate("/pm/tasks")}>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-700">{completedTasks} task{completedTasks > 1 ? "s" : ""} awaiting your review</p>
              <p className="text-xs text-emerald-600">Tap to review and approve or request rework</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <p className="text-sm text-muted-foreground">Welcome back,</p>
        <h2 className="text-xl font-bold text-foreground">{user?.user_metadata?.full_name ?? "Property Manager"}</h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="cursor-pointer" onClick={() => navigate("/pm/units")}>
          <CardContent className="p-4 flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold text-foreground">{unitList.length}</p>
              <p className="text-xs text-muted-foreground">Active Units</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => navigate("/pm/tasks")}>
          <CardContent className="p-4 flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold text-foreground">{taskList.length}</p>
              <p className="text-xs text-muted-foreground">Total Tasks</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer" onClick={() => navigate("/pm/vendors")}>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-primary shrink-0" />
            <div>
              <p className="text-2xl font-bold text-foreground">{vendorList.length}</p>
              <p className="text-xs text-muted-foreground">Vendors</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive shrink-0" />
            <div>
              <p className="text-2xl font-bold text-foreground">{totalIssues}</p>
              <p className="text-xs text-muted-foreground">Open Issues</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall progress gauge */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-1">Overall Turnover Progress</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress value={overallProgress} className="h-3" />
            </div>
            <span className="text-2xl font-bold text-primary">{overallProgress}%</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{doneOrApproved} of {taskList.length} tasks completed/approved across {unitList.length} units</p>
        </CardContent>
      </Card>

      {/* Task Status + Priority charts side by side */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Task Status</h3>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={taskStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {taskStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(214, 20%, 88%)" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              {taskStatusData.map((d) => (
                <span key={d.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.value} {d.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">By Priority</h3>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={priorityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={55}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {priorityData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(214, 20%, 88%)" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              {priorityData.map((d) => (
                <span key={d.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                  {d.value} {d.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vendor performance bar chart */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Vendor Performance</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={vendorPerformance} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(215, 12%, 50%)" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(215, 12%, 50%)" allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(214, 20%, 88%)" }}
              />
              <Bar dataKey="tasks" name="Assigned" fill="hsl(215, 12%, 70%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill={COLORS.completed} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Units overview list */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Units Overview</h3>
        <div className="space-y-3">
          {unitList.map((unit) => {
            const unitTasks = unit.taskIds.map((id) => tasks[id]).filter(Boolean);
            const completed = unitTasks.filter((t) => t.status === "Completed" || t.status === "Approved").length;
            const progress = unitTasks.length
              ? Math.round((completed / unitTasks.length) * 100)
              : 0;
            return (
              <Card
                key={unit.id}
                className="cursor-pointer active:scale-[0.98] transition-transform"
                onClick={() => navigate(`/pm/units/${unit.id}`)}
              >
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">Unit {unit.unitNumber}</p>
                    {(() => {
                      const allApproved = unitTasks.length > 0 && unitTasks.every((t) => t.status === "Approved");
                      const anyActive = unitTasks.some((t) => ["In Progress", "Rework", "Completed"].includes(t.status));
                      const derivedStatus = allApproved ? "Complete" : anyActive ? "In Progress" : "Not Started";
                      const style = allApproved
                        ? "bg-emerald-500/15 text-emerald-700 border-emerald-200"
                        : anyActive
                          ? "bg-amber-500/15 text-amber-700 border-amber-200"
                          : "bg-muted text-muted-foreground";
                      return (
                        <Badge variant="outline" className={style}>{derivedStatus}</Badge>
                      );
                    })()}
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{unitTasks.length} task(s)</span>
                    <span>{progress}% complete</span>
                  </div>
                  <Progress value={progress} className="h-1.5" />
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PMDashboard;
