import { cn } from "@/lib/utils";

interface FromDrewNoteProps {
  className?: string;
}

export function FromDrewNote({ className }: FromDrewNoteProps) {
  return (
    <p
      className={cn(
        "text-muted-foreground/75 text-center text-[11px] tracking-wide sm:text-xs",
        className,
      )}
    >
      thanks for being here — drew
    </p>
  );
}
