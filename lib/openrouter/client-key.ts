"use client";

import { DEFAULT_MODEL } from "@/app/lib/definitions";
import {
  OPENROUTER_KEY,
  SELECTED_MODEL_KEY,
} from "@/lib/workspace/keys";

export function getOpenRouterKey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(OPENROUTER_KEY);
}

export function setOpenRouterKey(key: string): void {
  localStorage.setItem(OPENROUTER_KEY, key.trim());
}

export function clearOpenRouterKey(): void {
  localStorage.removeItem(OPENROUTER_KEY);
  localStorage.removeItem(SELECTED_MODEL_KEY);
}

export function hasOpenRouterKey(): boolean {
  const key = getOpenRouterKey();
  return Boolean(key && key.trim().length > 0);
}

export function getSelectedModel(): string {
  if (typeof window === "undefined") {
    return DEFAULT_MODEL;
  }

  return localStorage.getItem(SELECTED_MODEL_KEY) ?? DEFAULT_MODEL;
}

export function setSelectedModel(model: string): void {
  localStorage.setItem(SELECTED_MODEL_KEY, model);
}
