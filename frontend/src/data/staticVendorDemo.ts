/**
 * Static vendor demo data — no backend. Used for testing the vendor workflow.
 */
import type { Task, Unit } from "@backend/types";

const DEMO_UNIT_ID = "demo-unit-1";
const DEMO_PROPERTY_NAME = "Demo Property";
const DEMO_ADDRESS = "456 Demo St";

export const staticDemoUnits: Record<string, Unit> = {
  [DEMO_UNIT_ID]: {
    id: DEMO_UNIT_ID,
    propertyId: "demo-prop-1",
    unitNumber: "101",
    propertyName: DEMO_PROPERTY_NAME,
    address: DEMO_ADDRESS,
    turnoverStatus: "",
    taskIds: ["demo-task-1", "demo-task-2", "demo-task-3"],
  },
};

const today = new Date();
const dueDate = new Date(today);
dueDate.setDate(dueDate.getDate() + 7);
const dueDateStr = dueDate.toISOString().slice(0, 10);

export const staticDemoTasks: Record<string, Task> = {
  "demo-task-1": {
    id: "demo-task-1",
    unitId: DEMO_UNIT_ID,
    vendorId: "demo-vendor",
    name: "Turnover cleaning",
    description: "Full clean for unit turnover. Complete checklist and add proof photos.",
    status: "Not Started",
    priority: "Medium",
    estimatedDuration: "1–2 hours",
    dueDate: dueDateStr,
    checklist: [
      { id: "c1", label: "Vacuum and mop floors", checked: false },
      { id: "c2", label: "Wipe all surfaces", checked: false },
      { id: "c3", label: "Clean bathroom", checked: false },
      { id: "c4", label: "Clean kitchen", checked: false },
    ],
    specifications: [
      "Use approved cleaning supplies.",
      "Ensure no streaks on glass.",
    ],
    photos: [],
    issues: [],
  },
  "demo-task-2": {
    id: "demo-task-2",
    unitId: DEMO_UNIT_ID,
    vendorId: "demo-vendor",
    name: "Paint touch-up",
    description: "Touch up scuffs and marks on walls in living area.",
    status: "In Progress",
    priority: "Low",
    estimatedDuration: "30 min",
    dueDate: dueDateStr,
    checklist: [
      { id: "c1", label: "Match existing paint", checked: true },
      { id: "c2", label: "Apply touch-up", checked: true },
      { id: "c3", label: "Clean brushes", checked: false },
    ],
    specifications: ["Use paint from storage closet."],
    photos: [],
    issues: [],
  },
  "demo-task-3": {
    id: "demo-task-3",
    unitId: DEMO_UNIT_ID,
    vendorId: "demo-vendor",
    name: "Inspection prep",
    description: "Final walk-through prep. Already completed for demo.",
    status: "Approved",
    priority: "Medium",
    estimatedDuration: "20 min",
    dueDate: dueDateStr,
    checklist: [
      { id: "c1", label: "Check all rooms", checked: true },
      { id: "c2", label: "Remove debris", checked: true },
    ],
    specifications: [],
    photos: [],
    issues: [],
  },
};
