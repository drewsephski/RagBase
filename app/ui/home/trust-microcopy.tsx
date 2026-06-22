import { LIMITS } from "@/app/lib/definitions";
import { cn } from "@/lib/utils";

interface TrustMicrocopyProps {
  className?: string;
  compact?: boolean;
}

export function TrustMicrocopy({ className, compact = false }: TrustMicrocopyProps) {
  return (
    <p
      className={cn(
        "text-muted-foreground text-center leading-relaxed",
        compact ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm",
        className,
      )}
    >
      Saved in this browser · Delete anytime · We do not train on your documents
      {!compact ? (
        <>
          {" "}
          · Auto-deletes after {LIMITS.RETENTION_DAYS} days of inactivity
        </>
      ) : null}
    </p>
  );
}
