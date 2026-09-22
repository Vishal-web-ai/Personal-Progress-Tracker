"use client";

import React, { useState } from "react";
import { Star, Save, X, MessageSquare, AlertTriangle, ArrowRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Textarea } from "@/components/ui/Form";
import { useApp } from "@/store/app-store";
import { useToast } from "@/store/toast-store";
import { PhaseRetrospective } from "@/types";

interface PhaseRetrospectiveModalProps {
  open: boolean;
  onClose: () => void;
  phaseId: string;
  goalId: string;
  phaseTitle: string;
  existingRetrospective?: PhaseRetrospective;
}

export function PhaseRetrospectiveModal({
  open,
  onClose,
  phaseId,
  goalId,
  phaseTitle,
  existingRetrospective,
}: PhaseRetrospectiveModalProps) {
  const { addPhaseRetrospective, getPhaseRetrospective } = useApp();
  const { toast } = useToast();

  const [whatWorked, setWhatWorked] = useState(existingRetrospective?.whatWorked || "");
  const [whatBlocked, setWhatBlocked] = useState(existingRetrospective?.whatBlocked || "");
  const [whatNext, setWhatNext] = useState(existingRetrospective?.whatNext || "");
  const [rating, setRating] = useState(existingRetrospective?.rating || 3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!whatWorked.trim() && !whatBlocked.trim() && !whatNext.trim()) {
      toast("Add at least one reflection point", "warn");
      return;
    }

    setIsSubmitting(true);
    try {
      addPhaseRetrospective({
        phaseId,
        goalId,
        whatWorked: whatWorked.trim(),
        whatBlocked: whatBlocked.trim(),
        whatNext: whatNext.trim(),
        rating,
      });
      toast("Retrospective saved");
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditing = !!existingRetrospective;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Retrospective" : `Retrospective: ${phaseTitle}`}
      className="max-w-lg"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" className="flex-1" onClick={handleSubmit} disabled={isSubmitting}>
            <Save size={14} /> {isSubmitting ? "Saving..." : isEditing ? "Update" : "Save"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="rounded-[16px] bg-surface-elevated/50 p-4 border border-border-soft">
          <div className="flex items-center gap-2 text-[13px] text-muted mb-3">
            <span className="font-medium text-primary">Phase:</span>
            <span>{phaseTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-muted">Your rating:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="pressable p-1 rounded transition-colors"
                  aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                >
                  <Star
                    size={20}
                    className={cn(
                      star <= rating ? "text-amber-400 fill-current" : "text-muted",
                      "transition-colors"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <Field label="What Worked Well?">
          <Textarea
            value={whatWorked}
            onChange={(e) => setWhatWorked(e.target.value)}
            placeholder="What went smoothly? What strategies helped? What would you repeat?"
            rows={4}
          />
          <p className="mt-1 text-[12px] text-muted">Celebrate wins and identify patterns to reuse</p>
        </Field>

        <Field label="What Blocked or Slowed You Down?">
          <Textarea
            value={whatBlocked}
            onChange={(e) => setWhatBlocked(e.target.value)}
            placeholder="What got in the way? Dependencies? Unclear scope? Energy dips? External factors?"
            rows={4}
          />
          <p className="mt-1 text-[12px] text-muted">Be honest — this is for your future self</p>
        </Field>

        <Field label="What Would You Do Differently Next Time?">
          <Textarea
            value={whatNext}
            onChange={(e) => setWhatNext(e.target.value)}
            placeholder="Process changes? Better estimates? Different order? Tools to adopt?"
            rows={4}
          />
          <p className="mt-1 text-[12px] text-muted">Actionable takeaways for the next phase</p>
        </Field>

        {isEditing && existingRetrospective && (
          <div className="rounded-[12px] bg-surface p-3 border border-border-soft">
            <div className="flex items-center gap-2 text-[12px] text-muted mb-1">
              <Check size={14} className="text-low" />
              <span className="font-medium text-primary">Previously saved</span>
              <span className="ml-auto">{new Date(existingRetrospective.createdAt).toLocaleDateString()}</span>
            </div>
            <p className="text-[12px] text-muted">Your previous reflection will be updated.</p>
          </div>
        )}

        <div className="rounded-[16px] bg-accent/5 border border-accent/10 p-4">
          <div className="flex items-start gap-3">
            <MessageSquare size={18} className="text-accent mt-0.5 shrink-0" />
            <div className="text-[13px] text-secondary leading-relaxed">
              <p className="font-medium text-primary mb-1">Why reflect?</p>
              <p>Taking 2 minutes to capture what happened turns experience into wisdom. Your future self will thank you when planning the next goal.</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}