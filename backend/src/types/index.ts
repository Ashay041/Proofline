/**
 * Domain types (value objects and entities).
 * Single Responsibility: immutable data shapes only; no behaviour, no UI.
 * Used by both backend services and frontend.
 */

// ─── Value Objects ───────────────────────────────────────────────

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
  /** Geo at submit (vendor); set when location verification is used. */
  readonly geoLat?: number;
  readonly geoLng?: number;
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
  readonly pmId?: string;
  readonly pmName?: string;
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

/** Property owned by a PM; contains units. */
export interface Property {
  readonly id: string;
  readonly name: string;
  readonly address: string;
}

export interface Vendor {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly specialty: string;
}

/** Unit under a property. */
export interface Unit {
  readonly id: string;
  readonly propertyId: string;
  readonly unitNumber: string;
  readonly propertyName: string;
  readonly address: string;
  readonly turnoverStatus: string;
  readonly taskIds: string[];
  readonly unitType?: string;
  readonly sqFt?: number;
  readonly tenantName?: string;
  readonly leaseStart?: string;
  readonly leaseEnd?: string;
  readonly leaseTermMonths?: number;
  readonly moveInDate?: string;
  readonly securityDeposit?: number;
  readonly monthlyRent?: number;
  readonly lastIncrease?: number;
  readonly concession?: number;
  readonly parking?: number;
  readonly lateFee?: number;
  readonly otherFee?: number;
  readonly marketRent?: number;
  readonly leaseStatus?: string;
  readonly occupants?: number;
  readonly petRent?: number;
  readonly arrears?: number;
  readonly moveInSpecials?: string;
  readonly subsidizedRent?: number;
  readonly lastPaidDate?: string;
  readonly utilityBillbacks?: number;
  readonly leaseBreakFee?: number;
  readonly annualRent?: number;
  readonly notes?: string;
}

/** Document attached to a unit (floor plans, spreadsheets, etc.). */
export interface UnitDocument {
  readonly id: string;
  readonly unitId: string;
  readonly fileUrl: string;
  readonly fileName: string;
  readonly fileType: string;
  readonly uploadedAt: string;
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
