import { describe, it, expect } from "vitest";
import { validate, MAX_LEN, rateLimited, extractText, cleanText } from "../netlify/functions/chat.mjs";

describe("cleanText", () => {
  it("strips OpenAI citation markers", () => {
    expect(cleanText("UGCC built the berth【4:0†source】.")).toBe("UGCC built the berth.");
  });
  it("unwraps markdown links whose target is a bare source index", () => {
    expect(cleanText("See [صفحة الاتصال](15) for more.")).toBe("See صفحة الاتصال for more.");
  });
  it("leaves real markdown links alone", () => {
    expect(cleanText("Visit [contact](/contact-us).")).toBe("Visit [contact](/contact-us).");
  });
});

describe("rateLimited", () => {
  it("trips after RATE_MAX requests in the window", () => {
    const key = "sess-" + Math.random();
    let tripped = false;
    for (let i = 0; i < 15; i++) tripped = rateLimited(key, 1000 + i);
    expect(tripped).toBe(true);
  });
  it("does not trip for a fresh key", () => {
    expect(rateLimited("fresh-" + Math.random())).toBe(false);
  });
});

describe("validate", () => {
  it("rejects empty message", () => {
    expect(validate({ message: "" }).ok).toBe(false);
  });
  it("rejects over-length message", () => {
    expect(validate({ message: "x".repeat(MAX_LEN + 1) }).ok).toBe(false);
  });
  it("accepts a normal message", () => {
    expect(validate({ message: "What has UGCC built in Oman?" }).ok).toBe(true);
  });
  it("caps history length", () => {
    const history = Array.from({ length: 50 }, () => ({ role: "user", content: "hi" }));
    const r = validate({ message: "hi", history });
    expect(r.ok).toBe(true);
    expect(r.history.length).toBeLessThanOrEqual(12);
  });
});

describe("extractText", () => {
  it("pulls output_text from a Responses payload", () => {
    const data = {
      output: [
        { type: "file_search_call", id: "fs_1" },
        { type: "message", content: [{ type: "output_text", text: "UGCC built the Duqm berth." }] },
      ],
    };
    expect(extractText(data)).toBe("UGCC built the Duqm berth.");
  });
  it("returns empty string when there is no message", () => {
    expect(extractText({ output: [] })).toBe("");
  });
});
