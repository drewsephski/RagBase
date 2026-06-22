import { getFeedbackUrl } from "@/lib/env/public";
import { cn } from "@/lib/utils";

interface BetaFeedbackCtaProps {
  className?: string;
}

export function BetaFeedbackCta({ className }: BetaFeedbackCtaProps) {
  const feedbackUrl = getFeedbackUrl();

  if (!feedbackUrl) {
    return null;
  }

  return (
    <p
      className={cn(
        "text-muted-foreground text-center text-[11px] leading-relaxed sm:text-xs",
        className,
      )}
    >
      RagBase is in public beta. Found a bad answer or broken document?{" "}
      <a
        href={feedbackUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground underline underline-offset-2 hover:text-primary"
      >
        Send feedback
      </a>
    </p>
  );
}
