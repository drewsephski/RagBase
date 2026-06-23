import { z } from "zod";

export const templateIdSchema = z.enum([
  "hospital-qi",
  "hardware-review",
  "contract-review",
  "vendor-compare",
  "research-brief",
  "policy-compliance",
  "meeting-recap",
  "financial-review",
]);
export type TemplateId = z.infer<typeof templateIdSchema>;

export interface WorkspaceTemplate {
  id: TemplateId;
  tabLabel: string;
  workspaceName: string;
  headline: string;
  subheadline: string;
  description: string;
  highlights: readonly string[];
  workflowSteps: readonly string[];
  starterAudienceHint: string;
  promptChips: readonly string[];
  safeUse: {
    title: string;
    summary: string;
    safeItems: readonly string[];
    avoidItems: readonly string[];
    footer: string;
  };
}

const HOSPITAL_QI_TEMPLATE: WorkspaceTemplate = {
  id: "hospital-qi",
  tabLabel: "Hospital QI",
  workspaceName: "Hospital AI Pilot Research",
  headline: "Research AI pilots with cited evidence",
  subheadline: "Built for hospital quality & operations work",
  description:
    "Upload de-identified reports, public guidance, or proposal drafts. Every answer links to the exact passage — like an audit trail for what you read before you pitch a pilot.",
  highlights: [
    "Pilot research prompts for metrics, risks, and governance",
    "Safe-use guidance for de-identified hospital data",
    "Cited answers you can bring to a staff meeting",
  ],
  workflowSteps: [
    "Add public research and de-identified ops reports (no PHI).",
    "Ask pilot questions — metrics, risks, governance, DMAIC outline.",
    "Click citations to verify every claim before a staff meeting.",
    "Export the chat and edit into an internal proposal.",
  ],
  starterAudienceHint:
    "The user is a hospital quality / Six Sigma professional researching operational AI pilots (not clinical diagnosis). Favor questions about metrics, risks, governance, pilot design, and executive summaries with cited evidence.",
  promptChips: [
    "What operational AI wins do these sources describe — not clinical diagnosis?",
    "What metrics did successful pilots actually track?",
    "What failure modes and risks do these sources warn about?",
    "Draft an executive summary — every bullet must cite a source.",
    "What would Compliance or IT likely push back on?",
    "Turn this into a DMAIC-style 90-day pilot outline.",
  ],
  safeUse: {
    title: "Safe use at work",
    summary:
      "Use RagBase for public sources and fully de-identified operational data only — not patient records.",
    safeItems: [
      "Public URLs (CMS, Joint Commission public pages, published research)",
      "Aggregated ops reports with no patient names, MRNs, or dates tied to individuals",
      "Your own notes, charters, and proposal drafts without PHI",
      "Synthetic or heavily redacted examples for learning",
    ],
    avoidItems: [
      "MRNs, names, dates of birth, or claim-level PHI",
      "Raw EHR exports or unstructured clinical notes",
      "Anything your hospital marks confidential without IT approval",
    ],
    footer:
      "For production pilots, route through IT, legal, and approved platforms with proper agreements.",
  },
};

const HARDWARE_REVIEW_TEMPLATE: WorkspaceTemplate = {
  id: "hardware-review",
  tabLabel: "Hardware",
  workspaceName: "Hardware Design Review",
  headline: "Review specs and datasheets with citations",
  subheadline: "Built for electrical engineering managers",
  description:
    "Drop datasheets, design notes, or vendor specs and ask pointed questions. Every answer cites the page so you can forward evidence to your team or program manager.",
  highlights: [
    "Pull ratings, pin functions, and derating limits fast",
    "Prep design reviews with risk and open-item questions",
    "Explain technical tradeoffs in plain English for stakeholders",
  ],
  workflowSteps: [
    "Upload a datasheet, app note, or design review PDF.",
    "Ask about limits, interfaces, compliance, or open risks.",
    "Use citations in review meetings instead of re-reading 80 pages.",
    "Compare a BOM note against a schematic revision when both are loaded.",
  ],
  starterAudienceHint:
    "The user is a hardware / electrical engineering manager reviewing datasheets, design docs, and vendor specs. Favor questions about ratings, pinouts, thermal/ESD limits, review risks, and plain-English summaries for non-engineers.",
  promptChips: [
    "What are the absolute max ratings and recommended operating conditions?",
    "List pin functions and default states at power-up.",
    "What open risks or action items does this design doc mention?",
    "Explain this section in plain English for a program review.",
    "What ESD, thermal, or derating requirements are documented?",
    "What questions should I ask the team before sign-off?",
  ],
  safeUse: {
    title: "Safe use for engineering docs",
    summary:
      "Fine for datasheets and internal docs you are allowed to use on personal tools — not for export-controlled or unreleased IP without approval.",
    safeItems: [
      "Public datasheets, app notes, and standards summaries",
      "Internal design docs you may use outside classified systems",
      "Redacted review packets without customer confidential details",
      "Your own meeting notes and checklists",
    ],
    avoidItems: [
      "Export-controlled schematics or ITAR-restricted packages",
      "Unreleased product designs without manager approval",
      "Customer-owned IP you are not permitted to upload anywhere",
    ],
    footer:
      "When in doubt, use public vendor PDFs only or ask your program office what is approved.",
  },
};

const CONTRACT_REVIEW_TEMPLATE: WorkspaceTemplate = {
  id: "contract-review",
  tabLabel: "Contracts",
  workspaceName: "Contract Review",
  headline: "Understand agreements before you sign",
  subheadline: "Built for leases, employment, and service terms",
  description:
    "Upload a contract or policy PDF and ask what it actually says — deadlines, cancellation, liability, and obligations — with citations you can verify line by line.",
  highlights: [
    "Find key dates, termination clauses, and payment terms",
    "Surface unusual liability or auto-renewal language",
    "Summarize obligations in plain English before you sign",
  ],
  workflowSteps: [
    "Upload the agreement or paste a link to public terms.",
    "Ask about deadlines, cancellation, fees, and your obligations.",
    "Click citations before you rely on any answer.",
    "Export the chat as notes for your lawyer or co-signer — not legal advice.",
  ],
  starterAudienceHint:
    "The user is reviewing a consumer or small-business contract. Favor questions about dates, termination, fees, liability, renewal, and plain-English summaries. Do not give legal advice — highlight what the document says.",
  promptChips: [
    "Summarize this agreement in plain English.",
    "What are the key dates, deadlines, and renewal terms?",
    "Find cancellation, termination, and refund language.",
    "What fees, penalties, or liability caps are mentioned?",
    "What obligations do I take on as the customer?",
    "Flag anything unusual compared to a typical agreement.",
  ],
  safeUse: {
    title: "Not legal advice",
    summary:
      "RagBase helps you read faster — it does not replace a lawyer. Avoid uploading documents you cannot store in a browser-based tool.",
    safeItems: [
      "Personal leases, offer letters, and service agreements you own",
      "Public terms-of-service pages pasted as URLs",
      "Redacted drafts with third-party secrets removed",
    ],
    avoidItems: [
      "Highly sensitive M&A, litigation, or privileged materials",
      "Other people's contracts shared without permission",
      "Documents your employer forbids on non-approved tools",
    ],
    footer:
      "Use cited passages as a reading aid. Confirm important decisions with qualified counsel.",
  },
};

const VENDOR_COMPARE_TEMPLATE: WorkspaceTemplate = {
  id: "vendor-compare",
  tabLabel: "Vendors",
  workspaceName: "Vendor Comparison",
  headline: "Compare quotes and SOWs side by side",
  subheadline: "Built for procurement and vendor selection",
  description:
    "Load up to five vendor PDFs — quotes, SOWs, warranties — and ask how they differ on price, scope, SLAs, and risk. Citations keep the comparison honest.",
  highlights: [
    "Compare milestones, acceptance criteria, and payment terms",
    "Spot gaps between what was quoted vs what was scoped",
    "Prepare vendor negotiation questions with cited evidence",
  ],
  workflowSteps: [
    "Upload each vendor quote or SOW as a separate document (up to five).",
    "Ask how scope, timeline, and liability differ across vendors.",
    "Use citations in your selection memo or negotiation prep.",
    "Re-run questions after a revised quote lands.",
  ],
  starterAudienceHint:
    "The user is comparing vendor quotes, SOWs, or warranties across multiple documents. Favor questions about scope, pricing structure, SLAs, liability, IP, and differences between sources.",
  promptChips: [
    "Compare payment milestones and acceptance criteria across vendors.",
    "Which quote includes support, warranty, or training — and for how long?",
    "What liability caps or indemnities does each vendor offer?",
    "Where do the SOWs disagree on deliverables or timeline?",
    "List questions I should ask before selecting a vendor.",
    "Summarize the lowest-risk option based only on these documents.",
  ],
  safeUse: {
    title: "Safe use for procurement",
    summary:
      "Use vendor PDFs you are permitted to evaluate. Redact pricing you cannot share outside your organization.",
    safeItems: [
      "Vendor quotes and SOWs approved for your evaluation",
      "Public product datasheets and standard terms pages",
      "Internal scoring rubrics and requirement checklists",
    ],
    avoidItems: [
      "Confidential pricing shared under NDA on unapproved tools",
      "Bid materials marked restricted or competitor confidential",
      "Personal payment or banking details in uploaded PDFs",
    ],
    footer:
      "Follow your organization's procurement and data-handling policies before uploading.",
  },
};

const RESEARCH_BRIEF_TEMPLATE: WorkspaceTemplate = {
  id: "research-brief",
  tabLabel: "Research",
  workspaceName: "Research Brief",
  headline: "Turn sources into a cited brief",
  subheadline: "Built for proposals, memos, and literature review",
  description:
    "Collect articles, reports, and notes — then ask for summaries, comparisons, and executive bullets where every claim points back to a source.",
  highlights: [
    "Synthesize multiple sources without losing citations",
    "Draft executive summaries with evidence-only bullets",
    "Compare what sources agree on — and where they conflict",
  ],
  workflowSteps: [
    "Add public URLs or PDFs for each source you want in the brief.",
    "Ask for themes, metrics, risks, or a one-page summary with citations.",
    "Click through citations before adding anything to a slide deck.",
    "Export the chat and edit into your final memo or proposal.",
  ],
  starterAudienceHint:
    "The user is building a research brief or proposal from multiple documents. Favor synthesis questions, executive summaries with cited bullets, comparison across sources, gaps in evidence, and plain-English takeaways.",
  promptChips: [
    "What themes appear across all of these sources?",
    "Draft an executive summary — every bullet must cite a source.",
    "Where do these documents agree or contradict each other?",
    "What metrics, outcomes, or claims are explicitly documented?",
    "What is missing or weak in the evidence base?",
    "Turn this into a one-page brief for leadership.",
  ],
  safeUse: {
    title: "Safe use for research",
    summary:
      "Best for public literature and documents you have rights to use. Check copyright and employer policy before uploading.",
    safeItems: [
      "Public articles, white papers, and documentation URLs",
      "Your own notes, outlines, and draft memos",
      "Licensed or internal reports you may use on personal tools",
    ],
    avoidItems: [
      "Paywalled PDFs you cannot legally redistribute or upload",
      "Confidential strategy docs without approval",
      "Personal data about individuals collected without consent",
    ],
    footer:
      "Cited summaries help you write faster — you still own fact-checking before publishing.",
  },
};

const POLICY_COMPLIANCE_TEMPLATE: WorkspaceTemplate = {
  id: "policy-compliance",
  tabLabel: "Compliance",
  workspaceName: "Policy & Compliance Review",
  headline: "Navigate policies and audit requirements",
  subheadline: "Built for SOPs, regulations, and checklists",
  description:
    "Upload policy manuals, audit checklists, or regulatory summaries and ask what applies to your process — with citations you can attach to an audit response.",
  highlights: [
    "Find required controls, documentation, and review cycles",
    "Map policy language to your team's actual workflow",
    "Prepare audit answers with quoted source passages",
  ],
  workflowSteps: [
    "Upload an SOP, policy PDF, or paste a public regulatory page.",
    "Ask what requirements apply to a specific process or role.",
    "Use citations in gap analyses or audit prep worksheets.",
    "Re-check after policy revisions land.",
  ],
  starterAudienceHint:
    "The user is reviewing policies, SOPs, or compliance documents. Favor questions about requirements, controls, documentation obligations, review frequency, and plain-English summaries for operational teams.",
  promptChips: [
    "What documentation or records does this policy require?",
    "Summarize the key controls and who owns them.",
    "What triggers an escalation, review, or re-certification?",
    "Explain this section for frontline staff in plain English.",
    "What gaps might an auditor ask about based on this text?",
    "List open questions we should clarify with Compliance.",
  ],
  safeUse: {
    title: "Safe use for compliance work",
    summary:
      "Use policies you are authorized to reference. Do not upload restricted audit findings on unapproved tools.",
    safeItems: [
      "Public regulatory guidance and standards overviews",
      "Internal SOPs approved for your role",
      "Redacted audit checklists without sensitive findings",
      "Your own gap-analysis notes and drafts",
    ],
    avoidItems: [
      "Privileged audit reports marked confidential",
      "Export-controlled or classified policy packages",
      "Patient or employee records used as compliance evidence",
    ],
    footer:
      "RagBase helps you read policies faster — your compliance officer owns final interpretations.",
  },
};

const MEETING_RECAP_TEMPLATE: WorkspaceTemplate = {
  id: "meeting-recap",
  tabLabel: "Meetings",
  workspaceName: "Meeting Recap",
  headline: "Turn notes into actions and decisions",
  subheadline: "Built for minutes, transcripts, and recaps",
  description:
    "Drop meeting notes or a transcript PDF and pull out decisions, owners, deadlines, and open questions — every item linked to where it was said.",
  highlights: [
    "Extract action items with owners and due dates",
    "Summarize decisions vs discussion that stayed open",
    "Draft a follow-up email grounded in the notes",
  ],
  workflowSteps: [
    "Upload minutes, a transcript export, or your raw notes.",
    "Ask for decisions, action items, and unresolved topics.",
    "Click citations before assigning work from the output.",
    "Export and paste into your task tracker or team channel.",
  ],
  starterAudienceHint:
    "The user is reviewing meeting notes or transcripts. Favor questions about decisions, action items, owners, deadlines, open questions, and concise follow-up summaries.",
  promptChips: [
    "List all action items with owners and deadlines mentioned.",
    "What decisions were made vs left unresolved?",
    "Summarize this meeting for someone who was not there.",
    "What blockers or risks were raised?",
    "Draft a follow-up email based only on these notes.",
    "What should be on the agenda for the next meeting?",
  ],
  safeUse: {
    title: "Safe use for meeting notes",
    summary:
      "Avoid uploading confidential conversations your organization restricts to approved systems.",
    safeItems: [
      "Your own notes and publicly shareable recaps",
      "Team meeting minutes without HR/legal privilege issues",
      "Redacted transcripts with sensitive names removed",
    ],
    avoidItems: [
      "Attorney-client privileged or HR investigative transcripts",
      "Board materials marked confidential without approval",
      "Recordings or notes you are not permitted to store externally",
    ],
    footer:
      "When meetings touch regulated data, use your employer's approved note-taking tools.",
  },
};

const FINANCIAL_REVIEW_TEMPLATE: WorkspaceTemplate = {
  id: "financial-review",
  tabLabel: "Finance",
  workspaceName: "Financial Report Review",
  headline: "Find the numbers that matter in reports",
  subheadline: "Built for budgets, dashboards, and variance memos",
  description:
    "Upload a budget pack, quarterly report, or variance memo and ask about trends, drivers, and targets — with citations back to the table or paragraph.",
  highlights: [
    "Surface variances, assumptions, and stated drivers quickly",
    "Compare narrative explanations to the numbers cited",
    "Prepare talking points for finance or ops reviews",
  ],
  workflowSteps: [
    "Upload a financial report, budget PDF, or exported dashboard notes.",
    "Ask about variances, trends, assumptions, and owner commentary.",
    "Verify every figure via citations before reusing in a deck.",
    "Pair with a narrative memo in the same workspace for context.",
  ],
  starterAudienceHint:
    "The user is reviewing financial or operational reports with numeric data. Favor questions about variances, trends, assumptions, KPIs, drivers, and executive summaries — only cite numbers explicitly in the documents.",
  promptChips: [
    "What variances vs plan or prior period are documented?",
    "What assumptions or drivers explain the numbers?",
    "Summarize KPIs and targets mentioned in plain English.",
    "What risks or caveats does management call out?",
    "What questions should I ask before the review meeting?",
    "Draft three talking points — each must cite a source.",
  ],
  safeUse: {
    title: "Safe use for financial docs",
    summary:
      "Use reports you are allowed to handle. Aggregated operational metrics only — not individual payroll or patient billing detail.",
    safeItems: [
      "Department budget summaries you may access",
      "Public investor or annual report excerpts",
      "Aggregated ops dashboards exported without individual detail",
      "Your own analysis notes and draft commentary",
    ],
    avoidItems: [
      "Individual salary, payroll, or patient billing records",
      "Material non-public financials before public release",
      "Bank account numbers or payment files",
    ],
    footer:
      "Follow your finance team's data classification rules before uploading.",
  },
};

const WORKSPACE_TEMPLATES: Record<TemplateId, WorkspaceTemplate> = {
  "hospital-qi": HOSPITAL_QI_TEMPLATE,
  "hardware-review": HARDWARE_REVIEW_TEMPLATE,
  "contract-review": CONTRACT_REVIEW_TEMPLATE,
  "vendor-compare": VENDOR_COMPARE_TEMPLATE,
  "research-brief": RESEARCH_BRIEF_TEMPLATE,
  "policy-compliance": POLICY_COMPLIANCE_TEMPLATE,
  "meeting-recap": MEETING_RECAP_TEMPLATE,
  "financial-review": FINANCIAL_REVIEW_TEMPLATE,
};

export const TEMPLATE_LIST: WorkspaceTemplate[] = [
  HOSPITAL_QI_TEMPLATE,
  HARDWARE_REVIEW_TEMPLATE,
  CONTRACT_REVIEW_TEMPLATE,
  VENDOR_COMPARE_TEMPLATE,
  RESEARCH_BRIEF_TEMPLATE,
  POLICY_COMPLIANCE_TEMPLATE,
  MEETING_RECAP_TEMPLATE,
  FINANCIAL_REVIEW_TEMPLATE,
];

export function parseTemplateId(value: string | null | undefined): TemplateId | null {
  const result = templateIdSchema.safeParse(value);
  return result.success ? result.data : null;
}

export function getWorkspaceTemplate(id: TemplateId): WorkspaceTemplate {
  return WORKSPACE_TEMPLATES[id];
}

export function getTemplateAppPath(id: TemplateId): string {
  return `/app?template=${id}`;
}

export function getTemplateLandingPath(id: TemplateId): string {
  return `/templates/${id}`;
}
