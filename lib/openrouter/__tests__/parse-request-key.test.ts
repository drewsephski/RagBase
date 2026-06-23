import { describe, expect, test } from "@jest/globals";
import {
  parseOpenRouterKey,
  parseOpenRouterKeyFromForm,
} from "@/lib/openrouter/parse-request-key";

describe("parseOpenRouterKey", () => {
  test("trims a direct string value", () => {
    expect(parseOpenRouterKey("  sk-test  ")).toBe("sk-test");
  });

  test("reads openRouterKey from JSON bodies", () => {
    expect(parseOpenRouterKey({ openRouterKey: "sk-test" })).toBe("sk-test");
    expect(parseOpenRouterKey({ openRouterKey: "   " })).toBeUndefined();
  });

  test("reads openRouterKey from form data", () => {
    const formData = new FormData();
    formData.set("openRouterKey", "sk-test");
    expect(parseOpenRouterKeyFromForm(formData)).toBe("sk-test");
  });
});
