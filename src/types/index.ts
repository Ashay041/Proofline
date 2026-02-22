// ─── Value Objects ───────────────────────────────────────────────
// Immutable data shapes. No behaviour, no dependencies.

export interface ChecklistItem {
  readonly id: string;
  readonly label: string;
  readonly checked: boolean;
}

export interface ReportedIssue {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly photoUrl?: string;
  readonly status: "Reported";
}

export interface ReworkItem {
  readonly checklistItemId: string;
  readonly note: string;
}

export interface TaskSubmission {
  readonly checklist: ChecklistItem[];
  readonly photos: string[];
  readonly submittedAt: string;
  readonly reworkItems?: ReworkItem[];
  readonly reworkNote?: string;
}

// ─── Status enums (typed unions) ────────────────────────────────

export type TaskStatus =
  | "Not Started"
  | "In Progress"
  | "Completed"
  | "Approved"
  | "Rework";

export type TaskPriority = "High" | "Medium" | "Low";

// ─── Aggregate Root: Task ───────────────────────────────────────

export interface Task {
  readonly id: string;
  readonly unitId: string;
  readonly vendorId: string;
  readonly name: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly reworkNote?: string;
  readonly reworkItems?: ReworkItem[];
  readonly priority: TaskPriority;
  readonly estimatedDuration: string;
  readonly dueDate: string;
  readonly checklist: ChecklistItem[];
  readonly specifications: string[];
  readonly photos: string[];
  readonly issues: ReportedIssue[];
  readonly submissionHistory?: TaskSubmission[];
}

// ─── Entities ───────────────────────────────────────────────────

export interface Vendor {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly specialty: string;
}

export interface Unit {
  readonly id: string;
  readonly unitNumber: string;
  readonly propertyName: string;
  readonly address: string;
  readonly turnoverStatus: string;
  readonly taskIds: string[];
}

// ─── AI ─────────────────────────────────────────────────────────

export interface AIChatPair {
  readonly question: string;
  readonly answer: string;
}

export interface ChatMessage {
  readonly role: "user" | "ai";
  readonly text: string;
}
