import {
  ALLOWED_FILE_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  LIMITS,
} from "@/app/lib/definitions";

export type AllowedFileExtension = (typeof ALLOWED_FILE_EXTENSIONS)[number];
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
export type FileKind = "pdf" | "docx" | "txt" | "md";

export class ValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "ValidationError";
    this.status = status;
  }
}

const EXTENSION_TO_KIND: Record<AllowedFileExtension, FileKind> = {
  ".pdf": "pdf",
  ".docx": "docx",
  ".txt": "txt",
  ".md": "md",
};

const EXTENSION_TO_MIME: Record<AllowedFileExtension, AllowedMimeType> = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".md": "text/markdown",
};

export function getFileExtension(filename: string): string {
  const normalized = filename.trim().toLowerCase();
  const lastDot = normalized.lastIndexOf(".");

  if (lastDot === -1) {
    return "";
  }

  return normalized.slice(lastDot);
}

export function isAllowedExtension(
  extension: string,
): extension is AllowedFileExtension {
  return (ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(extension);
}

export function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function getFileKind(filename: string): FileKind {
  const extension = getFileExtension(filename);

  if (!isAllowedExtension(extension)) {
    throw new ValidationError(
      `Unsupported file type. Allowed types: ${ALLOWED_FILE_EXTENSIONS.join(", ")}`,
    );
  }

  return EXTENSION_TO_KIND[extension];
}

export function validateFileExtension(filename: string): AllowedFileExtension {
  const extension = getFileExtension(filename);

  if (!isAllowedExtension(extension)) {
    throw new ValidationError(
      `Unsupported file type. Allowed types: ${ALLOWED_FILE_EXTENSIONS.join(", ")}`,
    );
  }

  return extension;
}

export function validateMimeType(mimeType: string): AllowedMimeType {
  const normalized = mimeType.trim().toLowerCase();

  if (!isAllowedMimeType(normalized)) {
    throw new ValidationError(
      `Unsupported MIME type. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`,
    );
  }

  return normalized;
}

export function validateExtensionMimeMatch(
  filename: string,
  mimeType: string,
): void {
  const extension = validateFileExtension(filename);
  const normalizedMime = validateMimeType(mimeType);
  const expectedMime = EXTENSION_TO_MIME[extension];

  if (normalizedMime !== expectedMime) {
    throw new ValidationError(
      `File extension and MIME type do not match (${extension} vs ${normalizedMime}).`,
    );
  }
}

export function validateFileSize(bytes: number): void {
  if (bytes <= 0) {
    throw new ValidationError("File is empty.");
  }

  if (bytes > LIMITS.MAX_FILE_BYTES) {
    throw new ValidationError(
      `File too large. Maximum size is ${LIMITS.MAX_FILE_BYTES / (1024 * 1024)} MB.`,
      413,
    );
  }
}

export interface UploadValidationInput {
  filename: string;
  mimeType: string;
  bytes: number;
}

export function validateUpload(input: UploadValidationInput): FileKind {
  validateExtensionMimeMatch(input.filename, input.mimeType);
  validateFileSize(input.bytes);
  return getFileKind(input.filename);
}
