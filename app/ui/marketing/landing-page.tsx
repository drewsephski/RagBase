import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { APP_PATH, SITE_TAGLINE } from "@/lib/domain/site";
import { Button } from "@/components/ui/button";
import { TrustRow } from "@/app/ui/home/trust-row";
import { CitationDemo } from "@/app/ui/marketing/citation-demo";
import { TemplateSpotlight } from "@/app/ui/marketing/template-spotlight";
import { HowItWorks } from "@/app/ui/marketing/how-it-works";
import { LandingHeader } from "@/app/ui/marketing/landing-header";
import { FromDrewNote } from "@/app/ui/layout/from-drew-note";

export function LandingPage() {
  return (
    <div className="landing-grid flex min-h-dvh flex-col">
      <LandingHeader />

      <main className="flex-1">
        <section className="px-4 py-12 sm:px-6 sm:py-20 md:py-24">
          <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-12 lg:gap-16">
            <div className="space-y-6 sm:space-y-8">
              <div className="space-y-4">
                <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
                  {SITE_TAGLINE}
                </p>
                <h1 className="text-pretty text-[clamp(1.75rem,5vw,2.75rem)] leading-[1.12] font-semibold tracking-tight">
                  Chat with PDFs, contracts, notes, and webpages
                </h1>
                <p className="text-muted-foreground max-w-md text-pretty text-base leading-relaxed sm:text-lg">
                  Drop a file or paste a link — get cited answers instantly.
                  No signup. Private workspace saved in this browser.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="group h-11 gap-2 px-6 text-base">
                  <Link href={APP_PATH}>
                    Start in your workspace
                    <ArrowRight className="icon-arrow-nudge size-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="ghost"
                  size="lg"
                  className="text-muted-foreground h-11"
                >
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>

              <p className="text-muted-foreground text-xs sm:text-sm">
                Free · No account · Cited answers · Delete anytime
              </p>
            </div>

            <div className="flex justify-center md:justify-end">
              <CitationDemo />
            </div>
          </div>
        </section>

        <HowItWorks />

        <TemplateSpotlight />

        <section className="border-t px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl">
            <TrustRow />
          </div>
        </section>

        <section className="border-t px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
            <h2 className="text-pretty text-xl font-semibold tracking-tight sm:text-2xl">
              Ready when your document is
            </h2>
            <p className="text-muted-foreground max-w-md text-sm sm:text-base">
              Open your workspace, add a file or URL, and ask your first
              question in under a minute.
            </p>
            <Button asChild size="lg" className="group mt-2 h-11 gap-2">
              <Link href={APP_PATH}>
                Open workspace
                <ArrowRight className="icon-arrow-nudge size-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-border/60 bg-background/70 border-t backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-7 pb-safe sm:px-6 sm:py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-0.5 text-center sm:text-left">
              <p className="text-sm font-medium tracking-tight">RagBase</p>
              <p className="text-muted-foreground text-xs">
                Document Q&amp;A with citations
              </p>
            </div>

            <Link
              href={APP_PATH}
              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors hover:underline hover:underline-offset-4"
            >
              Go to workspace
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>

          <div className="border-border/50 flex items-center justify-center border-t pt-5">
            <FromDrewNote />
          </div>
        </div>
      </footer>
    </div>
  );
}
