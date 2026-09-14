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
