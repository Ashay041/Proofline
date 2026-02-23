/**
 * Demo vendor context — static data, no backend. For testing the vendor workflow.
 */
import {
  createContext,
  useContext,
  useCallback,
  useState,
  type ReactNode,
} from "react";
import type { Task, Unit, ReportedIssue } from "@backend/types";
import { staticDemoTasks, staticDemoUnits } from "@/data/staticVendorDemo";

type DemoVendorState = {
  tasks: Record<string, Task>;
  units: Record<string, Unit>;
  getProgress: (taskId: string) => number;
  toggleChecklistItem: (taskId: string, itemId: string) => void;
  addPhoto: (taskId: string, photoUrl: string) => void;
  addIssue: (taskId: string, issue: ReportedIssue) => void;
  completeTask: (taskId: string, _options?: { geoLat?: number; geoLng?: number }) => void;
};

function deepCloneTasks(t: Record<string, Task>): Record<string, Task> {
  return JSON.parse(JSON.stringify(t));
}

const DemoVendorContext = createContext<DemoVendorState | null>(null);

export function DemoVendorProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Record<string, Task>>(() =>
    deepCloneTasks(staticDemoTasks)
  );
  const units = staticDemoUnits;

  const getProgress = useCallback(
    (taskId: string) => {
      const task = tasks[taskId];
      if (!task || !task.checklist.length) return 0;
      const checked = task.checklist.filter((c) => c.checked).length;
      return Math.round((checked / task.checklist.length) * 100);
    },
    [tasks]
  );

  const toggleChecklistItem = useCallback((taskId: string, itemId: string) => {
    setTasks((prev) => {
      const task = prev[taskId];
      if (!task) return prev;
      const checklist = task.checklist.map((c) =>
        c.id === itemId ? { ...c, checked: !c.checked } : c
      );
      const status =
        task.status === "Not Started" && checklist.some((c) => c.checked)
          ? "In Progress"
          : task.status;
      return {
        ...prev,
        [taskId]: { ...task, checklist, status },
      };
    });
  }, []);

  const addPhoto = useCallback((taskId: string, photoUrl: string) => {
    setTasks((prev) => {
      const task = prev[taskId];
      if (!task) return prev;
      return {
        ...prev,
        [taskId]: { ...task, photos: [...task.photos, photoUrl] },
      };
    });
  }, []);

  const addIssue = useCallback((taskId: string, issue: ReportedIssue) => {
    setTasks((prev) => {
      const task = prev[taskId];
      if (!task) return prev;
      return {
        ...prev,
        [taskId]: { ...task, issues: [...task.issues, issue] },
      };
    });
  }, []);

  const completeTask = useCallback(
    (taskId: string, _options?: { geoLat?: number; geoLng?: number }) => {
      setTasks((prev) => {
        const task = prev[taskId];
        if (!task) return prev;
        const submission = {
          checklist: task.checklist,
          photos: task.photos,
          submittedAt: new Date().toISOString(),
        };
        return {
          ...prev,
          [taskId]: {
            ...task,
            status: "Completed" as const,
            photos: [],
            submissionHistory: [
              ...(task.submissionHistory ?? []),
              submission,
            ],
          },
        };
      });
    },
    []
  );

  const value: DemoVendorState = {
    tasks,
    units,
    getProgress,
    toggleChecklistItem,
    addPhoto,
    addIssue,
    completeTask,
  };

  return (
    <DemoVendorContext.Provider value={value}>
      {children}
    </DemoVendorContext.Provider>
  );
}

export function useDemoVendor() {
  const ctx = useContext(DemoVendorContext);
  if (!ctx) throw new Error("useDemoVendor must be used within DemoVendorProvider");
  return ctx;
}
