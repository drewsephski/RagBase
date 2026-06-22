import { describe, expect, test } from "@jest/globals";
import { parseTemplateId, TEMPLATE_LIST } from "@/app/lib/templates";
import {
  consumePendingPrompt,
  peekPendingPrompt,
  setPendingPrompt,
} from "@/lib/templates/pending-prompt";

describe("parseTemplateId", () => {
  test("accepts hospital-qi", () => {
    expect(parseTemplateId("hospital-qi")).toBe("hospital-qi");
  });

  test("accepts all registered templates", () => {
    for (const template of TEMPLATE_LIST) {
      expect(parseTemplateId(template.id)).toBe(template.id);
    }
  });

  test("rejects unknown templates", () => {
    expect(parseTemplateId("hardware-manager")).toBeNull();
    expect(parseTemplateId("")).toBeNull();
    expect(parseTemplateId(null)).toBeNull();
  });
});

describe("pending prompt storage", () => {
  const store = new Map<string, string>();
  const storage = {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  } as unknown as Storage;

  test("stores and consumes a pending prompt", () => {
    setPendingPrompt("What metrics were tracked?", storage);
    expect(peekPendingPrompt(storage)).toBe("What metrics were tracked?");
    expect(consumePendingPrompt(storage)).toBe("What metrics were tracked?");
    expect(peekPendingPrompt(storage)).toBeNull();
  });
});
