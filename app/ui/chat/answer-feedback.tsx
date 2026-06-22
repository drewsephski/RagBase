"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  buildAnswerAnalyticsProperties,
  type AnswerFeedbackReason,
} from "@/lib/analytics/answer-quality";
import { trackEvent } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";

const FEEDBACK_REASONS: { id: AnswerFeedbackReason; label: string }[] = [
  { id: "incorrect", label: "Incorrect" },
  { id: "missing_source", label: "Missing source" },
  { id: "too_vague", label: "Too vague" },
  { id: "not_found", label: "Couldn't find answer" },
  { id: "other", label: "Other" },
];

interface AnswerFeedbackProps {
  sourceCount: number;
  workspaceId?: string;
  model?: string;
  citationCount: number;
  hasCitations: boolean;
}

export function AnswerFeedback({
  sourceCount,
  workspaceId,
  model,
  citationCount,
  hasCitations,
}: AnswerFeedbackProps) {
  const [submitted, setSubmitted] = useState(false);
  const [showReasons, setShowReasons] = useState(false);

  const baseProperties = buildAnswerAnalyticsProperties(
    { sourceCount, workspaceId, model },
    {
      citation_count: citationCount,
      has_citations: hasCitations,
    },
  );

  function handleHelpful(helpful: boolean) {
    if (submitted) {
      return;
    }

    if (helpful) {
      trackEvent("answer_feedback_submitted", {
        ...baseProperties,
        helpful: true,
      });
      setSubmitted(true);
      return;
    }

    setShowReasons(true);
  }

  function handleReason(reason: AnswerFeedbackReason) {
    if (submitted) {
      return;
    }

    trackEvent("answer_feedback_submitted", {
      ...baseProperties,
      helpful: false,
      feedback_reason: reason,
    });
    setSubmitted(true);
    setShowReasons(false);
  }

  function handleSkipReason() {
    if (submitted) {
      return;
    }

    trackEvent("answer_feedback_submitted", {
      ...baseProperties,
      helpful: false,
    });
    setSubmitted(true);
    setShowReasons(false);
  }

  if (submitted) {
    return (
      <p className="text-muted-foreground text-xs" aria-live="polite">
        Thanks for the feedback.
      </p>
    );
  }

  return (
    <div className="space-y-2" aria-label="Answer feedback">
      {!showReasons ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">Was this helpful?</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleHelpful(true)}
              className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
              aria-label="Mark answer as helpful"
            >
              Yes
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleHelpful(false)}
              className="text-muted-foreground hover:text-foreground h-7 px-2 text-xs"
              aria-label="Mark answer as not helpful"
            >
              No
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-muted-foreground text-xs">What went wrong?</p>
          <div className="flex flex-wrap gap-1">
            {FEEDBACK_REASONS.map((reason) => (
              <Button
                key={reason.id}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleReason(reason.id)}
                className={cn("h-7 px-2 text-xs")}
                aria-label={`Feedback reason: ${reason.label}`}
              >
                {reason.label}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSkipReason}
            className="text-muted-foreground h-7 px-2 text-xs"
            aria-label="Submit negative feedback without a reason"
          >
            Skip
          </Button>
        </div>
      )}
    </div>
  );
}
