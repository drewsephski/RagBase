import { FileText, MessageSquareQuote, Quote } from "lucide-react";

const STEPS = [
  {
    icon: FileText,
    title: "Drop a file or link",
    description:
      "Upload a PDF, Word doc, or paste a public URL. RagBase indexes it in your browser workspace.",
  },
  {
    icon: MessageSquareQuote,
    title: "Ask in plain language",
    description:
      "Type the question you would ask a colleague — summaries, deadlines, clauses, next steps.",
  },
  {
    icon: Quote,
    title: "Answers point to the source",
    description:
      "Every response quotes the original text so you can verify before you act on it.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-heading"
      className="border-t px-4 py-14 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 max-w-lg sm:mb-12">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-widest uppercase">
            How it works
          </p>
          <h2
            id="how-it-works-heading"
            className="text-pretty text-2xl font-semibold tracking-tight sm:text-3xl"
          >
            From document to answer in three moves
          </h2>
        </div>

        <ul className="grid gap-6 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step) => (
            <li key={step.title}>
              <article className="how-it-works-card group h-full space-y-3 p-5 sm:p-6">
                <div className="bg-muted/30 text-foreground inline-flex size-10 items-center justify-center rounded-lg border border-transparent transition-colors duration-500 group-hover:bg-muted/45">
                  <step.icon className="size-[18px]" aria-hidden />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-medium">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
