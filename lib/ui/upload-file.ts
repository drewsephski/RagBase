export function getUploadErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Upload failed. Please try again.";
}

export function pickInputFile(
  event: React.ChangeEvent<HTMLInputElement>,
): File | null {
  const file = event.target.files?.[0] ?? null;
  event.target.value = "";
  return file;
}
