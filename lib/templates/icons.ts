import {
  Calculator,
  ClipboardCheck,
  Cpu,
  FileSearch,
  GitCompare,
  Scale,
  ScrollText,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { TemplateId } from "@/app/lib/templates";

export const TEMPLATE_ICONS: Record<TemplateId, LucideIcon> = {
  "hospital-qi": ClipboardCheck,
  "hardware-review": Cpu,
  "contract-review": Scale,
  "vendor-compare": GitCompare,
  "research-brief": FileSearch,
  "policy-compliance": ScrollText,
  "meeting-recap": Users,
  "financial-review": Calculator,
};
