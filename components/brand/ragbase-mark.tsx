import { cn } from "@/lib/utils";

interface RagBaseMarkProps {
  className?: string;
  size?: number;
  title?: string;
}

export function RagBaseMark({
  className,
  size = 32,
  title = "RagBase",
}: RagBaseMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <title>{title}</title>
      <rect width="32" height="32" rx="8" className="fill-muted" />
      <path
        d="M7.5 6.5h10.2l3.8 3.8V23.5a2 2 0 0 1-2 2H7.5a2 2 0 0 1-2-2V8.5a2 2 0 0 1 2-2Z"
        className="fill-foreground"
        fillOpacity="0.95"
      />
      <path
        d="M17.7 6.5v3.8h3.8"
        className="stroke-background"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M9.2 13.8h8.1M9.2 16.8h6.2M9.2 19.8h7.4"
        className="stroke-background"
        strokeWidth="1.15"
        strokeLinecap="round"
        strokeOpacity="0.55"
      />
      <circle cx="24.2" cy="11.8" r="2.6" className="fill-emerald-400" />
      <circle
        cx="26.4"
        cy="20.2"
        r="1.55"
        className="fill-foreground"
        fillOpacity="0.45"
      />
      <circle
        cx="21.2"
        cy="22.4"
        r="1.55"
        className="fill-foreground"
        fillOpacity="0.45"
      />
      <path
        d="M20.2 11.8h2.4M24.2 14.6v3.1M22.1 21.1l1.6-1.4"
        className="stroke-emerald-400"
        strokeWidth="0.95"
        strokeLinecap="round"
        strokeOpacity="0.85"
      />
    </svg>
  );
}
