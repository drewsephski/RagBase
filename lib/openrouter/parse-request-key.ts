import { z } from "zod";

const openRouterKeyBodySchema = z.object({
  openRouterKey: z.string().optional(),
});

export function parseOpenRouterKey(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  const parsed = openRouterKeyBodySchema.safeParse(value);

  if (!parsed.success) {
    return undefined;
  }

  return parseOpenRouterKey(parsed.data.openRouterKey);
}

export function parseOpenRouterKeyFromForm(formData: FormData): string | undefined {
  return parseOpenRouterKey(formData.get("openRouterKey"));
}
