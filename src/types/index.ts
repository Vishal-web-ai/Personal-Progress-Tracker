export type Priority = "high" | "medium" | "low";

export type TaskStatus = "todo" | "in_progress" | "done";

export type TaskBucket = "daily" | "weekly" | "monthly";

export interface Task {
  id: string;
  title: string;
  description?: string;
  areaId: string;
  areaName: string;
  priority: Priority;
  status: TaskStatus;
  bucket: TaskBucket;
  icon: string;
  goalId?: string;
  day?: string;
  weekStart?: string;
  monthKey?: string;
  archived?: boolean;
  completedAt?: number;
  createdAt: number;
  hasTimer?: boolean;
  /** Daily only: repeat cadence in days. 1 = every day (the legacy `repeat: true`).
   *  Absent or 0 = one-time task. Every occurrence is its own record and advances
   *  its own `day` by exactly this step, so a series needs no separate anchor. */
  repeatEvery?: number;
}

export type TimerMode = "stopwatch" | "focus_target";

export type SessionStatus = "idle" | "running" | "paused" | "saving" | "saved";

export interface WorkSession {
  id: string;
  taskId: string;
  mode: TimerMode;
  startedAt: number;
  endedAt?: number;
  targetMinutes?: number;
  activeDuration: number;
  pausedDuration: number;
  focusRating?: number;
  notes?: string;
  status: SessionStatus;
}

export interface Area {
  id: string;
  name: string;
  icon: string;
  color?: string;
}

export interface GoalProgressPoint {
  day: number;
  value: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  pinned: boolean;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export type GoalStatus = 'active' | 'completed' | 'archived';
export type PhaseStatus = 'pending' | 'active' | 'completed';
export type PhaseTaskStatus = 'todo' | 'in_progress' | 'done';

export interface Goal {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  targetDate?: number;
  status: GoalStatus;
  phases: Phase[];
  progress: number; // 0-100, computed from phases
  color?: string; // swatch color for UI
  icon?: string; // key from ICON_OPTIONS (TaskIcon.tsx)
}

export interface Phase {
  id: string;
  goalId: string;
  title: string;
  description?: string;
  order: number;
  status: PhaseStatus;
  tasks: PhaseTask[];
  startedAt?: number;
  completedAt?: number;
  dependsOn?: string[]; // phase IDs that must complete first
  targetDate?: number; // optional target date for phase
  startDate?: number; // planned start date (planning only)
  endDate?: number; // planned end date (planning only)
  color?: string; // phase accent color (falls back to goal color)
  estimatedMinutes?: number; // sum of task estimates
  actualMinutes?: number; // sum of actual session time
}

export interface PhaseTask {
  id: string;
  phaseId: string;
  goalId: string;
  title: string;
  description?: string;
  order: number;
  status: PhaseTaskStatus;
  estimatedMinutes?: number;
  actualMinutes?: number;
  dueDate?: number;
  tags?: string[];
  isMilestone: boolean; // milestone marker
  createdAt: number;
  completedAt?: number;
}

export interface PhaseRetrospective {
  id: string;
  phaseId: string;
  goalId: string;
  whatWorked: string;
  whatBlocked: string;
  whatNext: string;
  rating: number; // 1-5
  createdAt: number;
}
