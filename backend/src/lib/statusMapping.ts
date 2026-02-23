/**
 * Maps between display-friendly status strings and DB enum values.
 * Dependency Inversion: domain types define the contract; DB adapts.
 */
import type { TaskStatus, TaskPriority } from "../types";

const STATUS_TO_DB: Record<TaskStatus, string> = {
  "Not Started": "not_started",
  "In Progress": "in_progress",
  "Completed": "completed",
  "Approved": "approved",
  "Rework": "rework",
};

const DB_TO_STATUS: Record<string, TaskStatus> = Object.fromEntries(
  Object.entries(STATUS_TO_DB).map(([k, v]) => [v, k as TaskStatus])
) as Record<string, TaskStatus>;

const PRIORITY_TO_DB: Record<TaskPriority, string> = {
  High: "high",
  Medium: "medium",
  Low: "low",
};

const DB_TO_PRIORITY: Record<string, TaskPriority> = Object.fromEntries(
  Object.entries(PRIORITY_TO_DB).map(([k, v]) => [v, k as TaskPriority])
) as Record<string, TaskPriority>;

export const toDbStatus = (s: TaskStatus): string => STATUS_TO_DB[s] ?? "not_started";
export const fromDbStatus = (s: string): TaskStatus => DB_TO_STATUS[s] ?? "Not Started";

export const toDbPriority = (p: TaskPriority): string => PRIORITY_TO_DB[p] ?? "medium";
export const fromDbPriority = (p: string): TaskPriority => DB_TO_PRIORITY[p] ?? "Medium";
