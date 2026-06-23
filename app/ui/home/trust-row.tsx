import { LIMITS } from "@/lib/domain/definitions";
import { Lock, ShieldCheck, Trash2, Clock } from "lucide-react";

const TRUST_ITEMS = [
  {
    icon: Lock,
    label: "Private to this browser",
    detail: "No account needed. Your workspace stays on this device.",
  },
  {
    icon: Clock,
    label: `${LIMITS.RETENTION_DAYS} days after last visit`,
    detail: "Saved in this browser for 14 days after your last visit. Delete anytime.",
  },
  {
    icon: ShieldCheck,
    label: "Never used for training",
    detail: "Your files are not used to train AI models.",
  },
  {
    icon: Trash2,
    label: "Delete anytime",
    detail: "Remove individual documents or wipe your whole workspace in one click.",
  },
] as const;

export function TrustRow() {
  return (
    <section aria-label="Privacy and trust" className="space-y-3">
      <p className="text-muted-foreground text-center text-xs sm:text-sm">
        Do not upload passwords, medical records, or other highly sensitive
        information.
      </p>

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
        {TRUST_ITEMS.map((item) => (
          <li
            key={item.label}
            className="bg-muted/30 flex gap-2.5 rounded-lg border p-2.5 sm:gap-3 sm:p-3"
          >
            <item.icon
              className="text-muted-foreground mt-0.5 size-4 shrink-0"
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium">{item.label}</p>
              <p className="text-muted-foreground text-xs">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
