import { Suspense } from "react";
import type { Metadata } from "next";
import { RecoverWorkspace } from "@/app/ui/recovery/recover-workspace";
import { Loader2 } from "lucide-react";
import { SITE_NAME } from "@/lib/domain/site";

export const metadata: Metadata = {
  title: `Recover workspace · ${SITE_NAME}`,
  robots: {
    index: false,
    follow: false,
  },
};

function RecoverFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="text-muted-foreground size-8 animate-spin" aria-hidden />
    </div>
  );
}

export default function RecoverPage() {
  return (
    <Suspense fallback={<RecoverFallback />}>
      <RecoverWorkspace />
    </Suspense>
  );
}
