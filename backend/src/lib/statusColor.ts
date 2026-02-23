/**
 * Shared status → Tailwind class mapping.
 * DRY: single source of truth for status styling (PM and vendor views).
 */
import type { TaskStatus } from "../types";

const STATUS_STYLES: Record<TaskStatus, string> = {
  Completed: "bg-emerald-500/15 text-emerald-700 border-emerald-200",
  Approved: "bg-emerald-600/20 text-emerald-800 border-emerald-300",
  Rework: "bg-orange-500/15 text-orange-700 border-orange-200",
  "In Progress": "bg-amber-500/15 text-amber-700 border-amber-200",
  "Not Started": "bg-muted text-muted-foreground",
};

export const statusColor = (status: string): string =>
  STATUS_STYLES[status as TaskStatus] ?? "bg-muted text-muted-foreground";
