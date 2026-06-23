import { OcrProviderError } from "@/lib/ingestion/ocr/errors";
import { parseOcrPagesFromText } from "@/lib/ingestion/ocr/parse-pages";
import type { PdfPage } from "@/lib/ingestion/pdf";

export function getOcrVisionModel(): string {
  return process.env.OCR_VISION_MODEL?.trim() || "google/gemini-2.5-flash";
}

export async function ocrPdfWithVision(
  buffer: Buffer,
  filename: string,
  pageCount: number,
  openRouterKey: string,
): Promise<PdfPage[]> {
  const apiKey = openRouterKey.trim();

  if (!apiKey) {
    throw new OcrProviderError("OpenRouter API key is required for larger scans.");
  }

  const base64Pdf = buffer.toString("base64");
  const model = getOcrVisionModel();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract all readable text from this scanned PDF (${pageCount} page${pageCount === 1 ? "" : "s"}). Return plain text only, using this exact format for each page:\nPAGE 1:\n<text>\nPAGE 2:\n<text>\nContinue through PAGE ${pageCount}. Do not add commentary.`,
            },
            {
              type: "file",
              file: {
                filename,
                file_data: `data:application/pdf;base64,${base64Pdf}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new OcrProviderError(
      `Vision OCR failed (${response.status}). Check your OpenRouter key and try again.`,
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim() ?? "";

  if (content.length === 0) {
    throw new OcrProviderError("Vision OCR returned no text.");
  }

  const pages = parseOcrPagesFromText(content, pageCount);

  if (pages.every((page) => page.text.length === 0)) {
    throw new OcrProviderError("Vision OCR returned no readable text.");
  }

  return pages;
}
