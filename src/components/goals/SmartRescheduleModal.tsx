"use client";

import React, { useState, useEffect, useRef } from "react";
import { Calendar, Clock, AlertTriangle, ArrowLeftRight, ChevronLeft, ChevronRight, Save, X, CalendarDays, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Form";
import { useApp } from "@/store/app-store";
import { useToast } from "@/store/toast-store";
import { Goal, Phase } from "@/types";
import { dayKeyFor, formatDate, addDays } from "@/lib/time";

interface SmartRescheduleModalProps {
  open: boolean;
  onClose: () => void;
  goal: Goal;
}

export function SmartRescheduleModal({ open, onClose, goal }: SmartRescheduleModalProps) {
  const { updatePhase, goals } = useApp();
  const { toast } = useToast();

  const [phaseDates, setPhaseDates] = useState<Record<string, { start: string; end: string }>>({});
  const [isAutoMode, setIsAutoMode] = useState(true);
  const [showConflicts, setShowConflicts] = useState(false);

  // Initialize dates from goal/phases
  useEffect(() => {
    if (open && goal) {
      const dates: Record<string, { start: string; end: string }> = {};
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);

      goal.phases.forEach((phase, index) => {
        const duration = Math.max(1, Math.ceil((phase.estimatedMinutes || 60) / 480)); // 8h work days
        const start = new Date(currentDate);
        const end = new Date(currentDate);
        end.setDate(end.getDate() + duration - 1);
        
        dates[phase.id] = {
          start: start.toISOString().split("T")[0],
          end: end.toISOString().split("T")[0],
        };
        
        // Add 1 day buffer between phases
        currentDate.setDate(currentDate.getDate() + duration + 1);
      });

      setPhaseDates(dates);
    }
  }, [open, goal]);

  const conflicts = useMemo(() => {
    const conflictList: Array<{ phaseId: string; phaseTitle: string; conflictWith: string }> = [];
    const phaseArray = Object.entries(phaseDates);
    
    for (let i = 0; i < phaseArray.length; i++) {
      for (let j = i + 1; j < phaseArray.length; j++) {
        const [id1, dates1] = phaseArray[i];
        const [id2, dates2] = phaseArray[j];
        
        const start1 = new Date(dates1.start);
        const end1 = new Date(dates1.end);
        const start2 = new Date(dates2.start);
        const end2 = new Date(dates2.end);
        
        if (start1 <= end2 && start2 <= end1) {
          const p1 = goal.phases.find((p) => p.id === id1);
          const p2 = goal.phases.find((p) => p.id === id2);
          if (p1 && p2) {
            conflictList.push({
              phaseId: id1,
              phaseTitle: p1.title,
              conflictWith: p2.title,
            });
            conflictList.push({
              phaseId: id2,
              phaseTitle: p2.title,
              conflictWith: p1.title,
            });
          }
        }
      }
    }
    
    return conflictList;
  }, [phaseDates, goal]);

  const updatePhaseDate = (phaseId: string, field: "start" | "end", value: string) => {
    setPhaseDates((prev) => ({
      ...prev,
      [phaseId]: { ...prev[phaseId], [field]: value },
    }));
    setIsAutoMode(false);
  };

  const autoSchedule = () => {
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    const newDates: Record<string, { start: string; end: string }> = {};
    
    goal.phases.forEach((phase) => {
      const duration = Math.max(1, Math.ceil((phase.estimatedMinutes || 60) / 480));
      const start = new Date(currentDate);
      const end = new Date(currentDate);
      end.setDate(end.getDate() + duration - 1);
      
      newDates[phase.id] = {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
      
      currentDate.setDate(currentDate.getDate() + duration + 1);
    });
    
    setPhaseDates(newDates);
    setIsAutoMode(true);
    toast("Auto-scheduled all phases");
  };

  const handleSave = () => {
    // Check for conflicts
    if (conflicts.length > 0 && !window.confirm("There are scheduling conflicts. Save anyway?")) {
      return;
    }

    // Update phases with new dates
    Object.entries(phaseDates).forEach(([phaseId, dates]) => {
      updatePhase(goal.id, phaseId, {
        targetDate: new Date(dates.end).getTime(),
      });
    });
    
    toast("Phase schedule updated");
    onClose();
  };

  const totalDuration = useMemo(() => {
    let days = 0;
    Object.values(phaseDates).forEach(({ start, end }) => {
      const s = new Date(start);
      const e = new Date(end);
      days += Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    });
    return days;
  }, [phaseDates]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Smart Reschedule"
      className="max-w-2xl max-h-[90dvh]"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleSave}>
            <Save size={14} /> Save Schedule
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Mode Toggle */}
        <div className="rounded-[12px] border border-border bg-surface-elevated/50 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-accent" />
              <span className="text-[13px] font-medium text-primary">Scheduling Mode</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAutoMode(true)}
                className={cn(
                  "pressable px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
                  isAutoMode ? "bg-accent text-[#061B14]" : "bg-surface text-secondary hover:bg-surface-elevated"
                )}
              >
                <Zap size={12} className="inline-block mr-1" /> Auto
              </button>
              <button
                onClick={() => setIsAutoMode(false)}
                className={cn(
                  "pressable px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors",
                  !isAutoMode ? "bg-accent text-[#061B14]" : "bg-surface text-secondary hover:bg-surface-elevated"
                )}
              >
                Manual
              </button>
            </div>
          </div>
          {isAutoMode && (
            <p className="mt-2 text-[12px] text-muted">
              Phases are automatically scheduled based on estimated effort with 1-day buffers.
              Switch to Manual to adjust individual dates.
            </p>
          )}
        </div>

        {/* Conflicts Warning */}
        {conflicts.length > 0 && (
          <div className={cn(
            "rounded-[12px] border border-amber-400/30 bg-amber-400/5 p-3 transition-all",
            showConflicts ? "max-h-64 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-[13px] font-medium text-amber-400">
                {conflicts.length} scheduling conflict{conflicts.length !== 1 ? "s" : ""} detected
              </span>
              <button
                onClick={() => setShowConflicts(!showConflicts)}
                className="ml-auto pressable text-[12px] text-amber-400 hover:underline"
              >
                {showConflicts ? "Hide" : "Show"} details
              </button>
            </div>
            {showConflicts && (
              <ul className="space-y-1 text-[12px] text-muted">
                {conflicts.map((c, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="font-medium text-primary">{c.phaseTitle}</span>
                    <span>overlaps with</span>
                    <span className="font-medium text-primary">{c.conflictWith}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Phase Schedule */}
        <div className="space-y-3">
          {goal.phases.map((phase, index) => {
            const dates = phaseDates[phase.id] || { start: "", end: "" };
            const isFirst = index === 0;
            const isLast = index === goal.phases.length - 1;
            
            // Check if this phase has conflicts
            const hasConflict = conflicts.some((c) => c.phaseId === phase.id);
            
            return (
              <div
                key={phase.id}
                className={cn(
                  "rounded-[16px] border bg-surface p-4 transition-colors relative",
                  hasConflict && "border-amber-400/30 bg-amber-400/5",
                  !hasConflict && "border-border hover:border-border"
                )}
              >
                {hasConflict && (
                  <div className="absolute -top-2 -right-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  </div>
                )}
                
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${goal.color || "var(--accent)"}20` }}>
                    <span className="text-[12px] font-bold" style={{ color: goal.color || "var(--accent)" }}>
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-medium text-primary truncate">{phase.title}</h4>
                    <p className="text-[12px] text-muted">
                      {phase.estimatedMinutes ? `${Math.round(phase.estimatedMinutes / 60)}h estimated` : "No time estimate"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Start Date">
                    <Input
                      type="date"
                      value={dates.start}
                      onChange={(e) => updatePhaseDate(phase.id, "start", e.target.value)}
                      disabled={isAutoMode}
                      min={isFirst ? dayKeyFor() : undefined}
                    />
                  </Field>
                  <Field label="End Date">
                    <Input
                      type="date"
                      value={dates.end}
                      onChange={(e) => updatePhaseDate(phase.id, "end", e.target.value)}
                      disabled={isAutoMode}
                      min={dates.start}
                    />
                  </Field>
                </div>

                {dates.start && dates.end && (
                  <div className="mt-2 flex items-center gap-2 text-[12px] text-muted">
                    <Clock size={12} />
                    <span>
                      Duration: {Math.ceil((new Date(dates.end).getTime() - new Date(dates.start).getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s)
                    </span>
                    {phase.dependsOn && phase.dependsOn.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-amber-400 flex items-center gap-1">
                          <ArrowLeftRight size={11} />
                          Depends on {phase.dependsOn.length} phase{phase.dependsOn.length > 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                  </div>
                )}

                {!isAutoMode && !isLast && (
                  <button
                    onClick={() => {
                      // Push this phase and all subsequent phases forward by 1 day
                      const newDates = { ...phaseDates };
                      const phaseIds = goal.phases.map((p) => p.id);
                      const currentIndex = phaseIds.indexOf(phase.id);
                      
                      for (let i = currentIndex + 1; i < phaseIds.length; i++) {
                        const pid = phaseIds[i];
                        if (newDates[pid]) {
                          const start = new Date(newDates[pid].start);
                          const end = new Date(newDates[pid].end);
                          start.setDate(start.getDate() + 1);
                          end.setDate(end.getDate() + 1);
                          newDates[pid] = {
                            start: start.toISOString().split("T")[0],
                            end: end.toISOString().split("T")[0],
                          };
                        }
                      }
                      setPhaseDates(newDates);
                    }}
                    className="mt-2 pressable text-[12px] text-accent hover:underline flex items-center gap-1"
                  >
                    <ArrowRight size={12} /> Push later phases +1 day
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="rounded-[16px] bg-surface-elevated/50 p-4 border border-border-soft">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-[20px] font-bold tabular-nums text-primary">{goal.phases.length}</div>
              <div className="text-[11px] text-muted">Phases</div>
            </div>
            <div>
              <div className="text-[20px] font-bold tabular-nums text-accent">{totalDuration}</div>
              <div className="text-[11px] text-muted">Total Days</div>
            </div>
            <div>
              <div className="text-[20px] font-bold tabular-nums text-secondary">
                {goal.targetDate ? Math.ceil((goal.targetDate - Date.now()) / (1000 * 60 * 60 * 24)) : "—"}
              </div>
              <div className="text-[11px] text-muted">Days to Goal Target</div>
            </div>
          </div>
        </div>

        {isAutoMode && (
          <Button variant="secondary" className="w-full" onClick={autoSchedule}>
            <CalendarDays size={14} className="mr-2" /> Re-run Auto-Schedule
          </Button>
        )}
      </div>
    </Modal>
  );
}

import { useMemo } from "react";
import { Zap } from "lucide-react";