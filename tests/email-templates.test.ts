import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  renderTemplate,
  renderTemplateSubject,
  SAMPLE_EMAIL_VARIABLES,
} from "@/lib/email-render";
import {
  emailBlocksToHtml,
  emailHtmlToBlocks,
  EMAIL_BLOCK_LABELS,
  EMAIL_BLOCK_TYPES,
} from "@/lib/email-blocks";

describe("escapeHtml", () => {
  it("escapes HTML metacharacters", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
  });
  it("treats null/undefined as empty string", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(0)).toBe("0");
  });
});

describe("renderTemplate", () => {
  it("replaces known variables with escaped values, leaving template markup intact", () => {
    const out = renderTemplate("<p>Hi {{name}}</p>", { name: "<b>Bold</b> & <i>Italic</i>" });
    expect(out).toBe("<p>Hi &lt;b&gt;Bold&lt;/b&gt; &amp; &lt;i&gt;Italic&lt;/i&gt;</p>");
  });
  it("leaves unknown variables untouched", () => {
    expect(renderTemplate("{{unknown}}", {})).toBe("{{unknown}}");
  });
  it("tolerates whitespace inside braces", () => {
    expect(renderTemplate("{{ name }}", { name: "A" })).toBe("A");
  });
  it("handles numeric and boolean values", () => {
    expect(renderTemplate("{{n}}/{{b}}", { n: 3, b: true })).toBe("3/true");
  });
});

describe("renderTemplateSubject", () => {
  it("substitutes plain text without escaping", () => {
    expect(renderTemplateSubject("Hi {{name}}", { name: "Sam & Co" })).toBe("Hi Sam & Co");
  });
});

describe("SAMPLE_EMAIL_VARIABLES", () => {
  it("covers the access_password and admin_invite placeholders", () => {
    for (const key of ["platformName", "accessPassword", "inviteUrl", "expiresAt"]) {
      expect(SAMPLE_EMAIL_VARIABLES[key]).toBeTruthy();
    }
  });
});

describe("email blocks", () => {
  it("serializes blocks to HTML and round-trips them", () => {
    const html = emailBlocksToHtml([
      { type: "heading", text: "Title" },
      { type: "paragraph", text: "Body" },
      { type: "password", text: "{{accessPassword}}" },
      { type: "button", text: "Go", url: "{{inviteUrl}}" },
      { type: "divider" },
    ]);
    const blocks = emailHtmlToBlocks(html);
    expect(blocks[0]).toEqual({ type: "heading", text: "Title" });
    expect(blocks[1]).toEqual({ type: "paragraph", text: "Body" });
    expect(blocks[2]).toEqual({ type: "password", text: "{{accessPassword}}" });
    expect(blocks[3]).toEqual({ type: "button", text: "Go", url: "{{inviteUrl}}" });
    expect(blocks[4]).toEqual({ type: "divider" });
  });

  it("falls back to a raw html block for arbitrary markup", () => {
    expect(emailHtmlToBlocks("<table><tr><td>X</td></tr></table>")).toEqual([
      { type: "html", html: "<table><tr><td>X</td></tr></table>" },
    ]);
  });

  it("renders the default access-password template body into password + paragraph blocks", () => {
    const html = [
      "<h1>{{platformName}}</h1>",
      "<p>Thanks for purchasing <strong>{{devotionalTitle}}</strong>.</p>",
      '<div style="display:block;font-size:1.4rem;font-weight:700;letter-spacing:.15em;padding:.75rem 1rem;background:#f1f5f9;border-radius:.5rem;password-box">{{accessPassword}}</div>',
    ].join("\n");
    const blocks = emailHtmlToBlocks(html);
    expect(blocks[0].type).toBe("heading");
    expect(blocks[1].type).toBe("paragraph");
    expect(blocks[2]).toEqual({ type: "password", text: "{{accessPassword}}" });
  });

  it("labels every block type", () => {
    for (const t of EMAIL_BLOCK_TYPES) {
      expect(typeof EMAIL_BLOCK_LABELS[t]).toBe("string");
    }
  });
});