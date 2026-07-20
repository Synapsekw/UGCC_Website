import { describe, it, expect } from "vitest";
import { validate, MAX_LEN, rateLimited, extractText, cleanText, formatSearchResults, pagePathForFilename, extractLinks } from "../netlify/functions/chat.mjs";

describe("formatSearchResults", () => {
  it("joins text content from vector-store search results", () => {
    const data = { data: [
      { filename: "a.txt", content: [{ type: "text", text: "Duqm berth in Oman." }] },
      { filename: "b.txt", content: [{ type: "text", text: "Cairo Street RA-200." }] },
    ] };
    const out = formatSearchResults(data).context;
    expect(out).toContain("Duqm berth in Oman.");
    expect(out).toContain("Cairo Street RA-200.");
  });
  it("returns empty context for no results", () => {
    expect(formatSearchResults({ data: [] }).context).toBe("");
  });
  it("tags each excerpt with its source page and collects the paths", () => {
    const data = { data: [
      { filename: "ra-200.txt", content: [{ type: "text", text: "Cairo Street RA-200." }] },
      { filename: "company-profile.txt", content: [{ type: "text", text: "Founded in 1976." }] },
    ] };
    const { context, paths } = formatSearchResults(data);
    expect(context).toContain("[Source page: /ra-200/]");
    expect(context).not.toContain("[Source page: /company-profile/]");
    expect(paths).toContain("/ra-200/");
    expect(paths).not.toContain("/company-profile/");
  });
});

describe("pagePathForFilename", () => {
  it("maps a corpus filename to its site path", () => {
    expect(pagePathForFilename("ra-200.txt")).toBe("/ra-200/");
    expect(pagePathForFilename("careers.txt")).toBe("/careers/");
  });
  it("maps the home corpus file to the site root", () => {
    expect(pagePathForFilename("home.txt")).toBe("/");
  });
  it("returns null for non-page sources and junk", () => {
    expect(pagePathForFilename("company-profile.txt")).toBe(null);
    expect(pagePathForFilename(undefined)).toBe(null);
    expect(pagePathForFilename("weird name!.pdf")).toBe(null);
  });
});

describe("extractLinks", () => {
  const allowed = ["/ra-200/", "/careers/", "/"];
  it("parses a trailing LINKS line into validated links and strips it from the text", () => {
    const raw = "UGCC rebuilt Cairo Street under contract RA-200.\nLINKS: /ra-200/ | Cairo Street Project; /careers/ | Careers";
    const { output, links } = extractLinks(raw, allowed);
    expect(output).toBe("UGCC rebuilt Cairo Street under contract RA-200.");
    expect(links).toEqual([
      { url: "/ra-200/", title: "Cairo Street Project" },
      { url: "/careers/", title: "Careers" },
    ]);
  });
  it("drops links whose path was not in the retrieved sources", () => {
    const raw = "Answer.\nLINKS: /ra-200/ | Real; /made-up-page/ | Fake";
    const { links } = extractLinks(raw, allowed);
    expect(links).toEqual([{ url: "/ra-200/", title: "Real" }]);
  });
  it("normalizes paths missing the trailing slash", () => {
    const { links } = extractLinks("A.\nLINKS: /ra-200 | Cairo Street", allowed);
    expect(links).toEqual([{ url: "/ra-200/", title: "Cairo Street" }]);
  });
  it("caps at three links and dedupes repeats", () => {
    const raw = "A.\nLINKS: /ra-200/ | One; /ra-200/ | Dup; /careers/ | Two; / | Three; /careers/ | Again";
    const { links } = extractLinks(raw, ["/ra-200/", "/careers/", "/"]);
    expect(links.map((l) => l.url)).toEqual(["/ra-200/", "/careers/", "/"]);
  });
  it("returns the text untouched when there is no LINKS line", () => {
    const { output, links } = extractLinks("Plain answer.", allowed);
    expect(output).toBe("Plain answer.");
    expect(links).toEqual([]);
  });
  it("strips a LINKS line even when every candidate is invalid", () => {
    const { output, links } = extractLinks("Answer.\nLINKS: /nope/ | Nope", allowed);
    expect(output).toBe("Answer.");
    expect(links).toEqual([]);
  });
});

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
