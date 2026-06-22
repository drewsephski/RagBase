import { cn } from "@/lib/utils";
import { RagBaseMark } from "@/components/brand/ragbase-mark";

interface RagBaseLogoProps {
  className?: string;
  markSize?: number;
  showTagline?: boolean;
  layout?: "horizontal" | "vertical";
}

export function RagBaseLogo({
  className,
  markSize = 32,
  showTagline = false,
  layout = "horizontal",
}: RagBaseLogoProps) {
  const isVertical = layout === "vertical";

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 sm:gap-3",
        isVertical && "flex-col text-center",
        className,
      )}
    >
      <RagBaseMark size={markSize} className="shrink-0" />

      <div className={cn("min-w-0", isVertical && "space-y-0.5 sm:space-y-1")}>
        <p
          className={cn(
            "font-semibold tracking-tight",
            markSize >= 48
              ? "text-xl sm:text-2xl md:text-3xl"
              : markSize >= 40
                ? "text-lg sm:text-xl"
                : "text-sm",
          )}
        >
          RagBase
        </p>
        {showTagline ? (
          <p
            className={cn(
              "text-muted-foreground text-pretty",
              markSize >= 48
                ? "text-xs sm:text-sm md:text-base"
                : "text-xs",
            )}
          >
            Chat with PDFs and links. Every answer cites the source.
          </p>
        ) : null}
      </div>
    </div>
  );
}
