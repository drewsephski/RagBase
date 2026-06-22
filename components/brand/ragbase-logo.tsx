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
        "flex items-center gap-3",
        isVertical && "flex-col text-center",
        className,
      )}
    >
      <RagBaseMark size={markSize} />

      <div className={cn("min-w-0", isVertical && "space-y-1")}>
        <p
          className={cn(
            "font-semibold tracking-tight",
            markSize >= 48 ? "text-2xl sm:text-3xl" : "text-sm",
          )}
        >
          RagBase
        </p>
        {showTagline ? (
          <p
            className={cn(
              "text-muted-foreground",
              markSize >= 48 ? "text-sm sm:text-base" : "text-xs",
            )}
          >
            Ask your documents. Get answers with quotes.
          </p>
        ) : null}
      </div>
    </div>
  );
}
