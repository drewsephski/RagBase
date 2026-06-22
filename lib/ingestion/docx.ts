import mammoth from "mammoth";

export interface ParsedDocx {
  rawText: string;
}

export async function parseDocx(buffer: Buffer): Promise<ParsedDocx> {
  const result = await mammoth.extractRawText({ buffer });
  const messages = result.messages
    .map((message) => message.message)
    .filter((message) => message.length > 0);

  if (messages.length > 0) {
    console.warn("DOCX parse warnings:", messages.join("; "));
  }

  const rawText = result.value.replace(/\r\n/g, "\n").trim();

  if (rawText.length === 0) {
    throw new Error("The Word document does not contain any readable text.");
  }

  return { rawText };
}
