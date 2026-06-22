import { PENDING_PROMPT_KEY } from "@/lib/templates/keys";

export function setPendingPrompt(text: string, storage: Storage = sessionStorage): void {
  storage.setItem(PENDING_PROMPT_KEY, text.trim());
}

export function peekPendingPrompt(storage: Storage = sessionStorage): string | null {
  const value = storage.getItem(PENDING_PROMPT_KEY);
  if (!value?.trim()) {
    return null;
  }
  return value.trim();
}

export function consumePendingPrompt(storage: Storage = sessionStorage): string | null {
  const value = peekPendingPrompt(storage);
  if (!value) {
    return null;
  }
  storage.removeItem(PENDING_PROMPT_KEY);
  return value;
}

export function clearPendingPrompt(storage: Storage = sessionStorage): void {
  storage.removeItem(PENDING_PROMPT_KEY);
}
