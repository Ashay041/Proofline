/**
 * Pure domain logic for Task operations.
 *
 * Single Responsibility: encapsulates all task business rules.
 * Open/Closed: new status transitions are added here, not in UI.
 * No React, no side‑effects — easily unit‑testable.
 */

import type {
  Task,
  ChecklistItem,
  ReworkItem,
  TaskSubmission,
  ReportedIssue,
} from "@/types";

// ─── Queries ────────────────────────────────────────────────────

export const getCheckedCount = (task: Task): number =>
  task.checklist.filter((c) => c.checked).length;

export const getProgress = (task: Task): number => {
  if (task.checklist.length === 0) return 0;
  return Math.round((getCheckedCount(task) / task.checklist.length) * 100);
};

export const getReworkItemIds = (task: Task): Set<string> =>
  new Set((task.reworkItems ?? []).map((r) => r.checklistItemId));

export const getReworkItemNotes = (task: Task): Record<string, string> => {
  const notes: Record<string, string> = {};
  (task.reworkItems ?? []).forEach((r) => {
    if (r.note) notes[r.checklistItemId] = r.note;
  });
  return notes;
};

export const isTerminalStatus = (task: Task): boolean =>
  task.status === "Completed" || task.status === "Approved";

export const canComplete = (task: Task): boolean => {
  if (isTerminalStatus(task)) return false;

  const reworkIds = getReworkItemIds(task);

  if (task.status === "Rework") {
    const reworkDone = task.checklist
      .filter((c) => reworkIds.has(c.id))
      .every((c) => c.checked);
    return reworkDone && task.photos.length > 0;
  }

  return (
    getCheckedCount(task) === task.checklist.length && task.photos.length > 0
  );
};

export const getReworkProgress = (task: Task): number => {
  const reworkIds = getReworkItemIds(task);
  if (reworkIds.size === 0) return 0;
  const done = task.checklist.filter(
    (c) => reworkIds.has(c.id) && c.checked
  ).length;
  return Math.round((done / reworkIds.size) * 100);
};

/** True when a "Completed" task is actually a rework resubmission (has prior submissions). */
export const isReworkResubmission = (task: Task): boolean =>
  task.status === "Completed" &&
  (task.submissionHistory ?? []).length > 0;

/** How many times the task has been submitted (including current). */
export const getSubmissionAttempt = (task: Task): number =>
  (task.submissionHistory ?? []).length + (task.status === "Completed" ? 1 : 0);

/** Get the most recent rework items from submission history. */
export const getLastReworkItems = (task: Task): ReworkItem[] => {
  const history = task.submissionHistory ?? [];
  if (history.length === 0) return [];
  const last = history[history.length - 1];
  return last.reworkItems ?? [];
};

/** Get the most recent rework note from submission history. */
export const getLastReworkNote = (task: Task): string | undefined => {
  const history = task.submissionHistory ?? [];
  if (history.length === 0) return undefined;
  return history[history.length - 1].reworkNote;
};

// ─── Commands (pure — return new Task) ──────────────────────────

export const toggleChecklistItem = (
  task: Task,
  itemId: string
): Task => {
  const checklist = task.checklist.map((c) =>
    c.id === itemId ? { ...c, checked: !c.checked } : c
  );
  const status =
    task.status === "Not Started" ? ("In Progress" as const) : task.status;
  return { ...task, checklist, status };
};

export const addPhoto = (task: Task, photoUrl: string): Task => ({
  ...task,
  photos: [...task.photos, photoUrl],
});

export const addIssue = (task: Task, issue: ReportedIssue): Task => ({
  ...task,
  issues: [...task.issues, issue],
});

export const completeTask = (task: Task): Task => ({
  ...task,
  status: "Completed",
});

export const approveTask = (task: Task): Task => ({
  ...task,
  status: "Approved",
  reworkNote: undefined,
  reworkItems: undefined,
});

export const requestRework = (
  task: Task,
  reworkItems: ReworkItem[],
  reworkNote?: string
): Task => {
  const submission: TaskSubmission = {
    checklist: [...task.checklist],
    photos: [...task.photos],
    submittedAt: new Date().toISOString(),
    reworkItems,
    reworkNote,
  };

  const flaggedIds = new Set(reworkItems.map((r) => r.checklistItemId));
  const checklist = task.checklist.map((c) =>
    flaggedIds.has(c.id) ? { ...c, checked: false } : c
  );

  return {
    ...task,
    status: "Rework",
    reworkNote,
    reworkItems,
    checklist,
    photos: [],
    submissionHistory: [...(task.submissionHistory ?? []), submission],
  };
};

// ─── Factory ────────────────────────────────────────────────────

export const createTask = (params: {
  unitId: string;
  vendorId: string;
  name: string;
  description: string;
  priority: Task["priority"];
  estimatedDuration: string;
  dueDate: string;
  checklist: ChecklistItem[];
  specifications: string[];
}): Task => ({
  id: `task-${Date.now()}`,
  ...params,
  status: "Not Started",
  photos: [],
  issues: [],
});
