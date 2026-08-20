// Pure email-block builder helpers (client-safe). The visual template editor
// composes blocks and serializes them to HTML; parsing is best-effort and
// falls back to a single raw-HTML block for hand-authored markup.

export type EmailBlockType = "paragraph" | "heading" | "password" | "button" | "divider" | "html";

export interface EmailBlock {
  type: EmailBlockType;
  text?: string;
  url?: string;
  html?: string;
}

export const EMAIL_BLOCK_LABELS: Record<EmailBlockType, string> = {
  paragraph: "Paragraph",
  heading: "Heading",
  password: "Password box",
  button: "Button",
  divider: "Divider",
  html: "Raw HTML",
};

export const EMAIL_BLOCK_TYPES = Object.keys(EMAIL_BLOCK_LABELS) as EmailBlockType[];

export function emailBlockToHtml(b: EmailBlock): string {
  switch (b.type) {
    case "heading":
      return `<h1>${b.text ?? ""}</h1>`;
    case "paragraph":
      return `<p>${b.text ?? ""}</p>`;
    case "password":
      return `<div style="display:block;font-size:1.4rem;font-weight:700;letter-spacing:.15em;padding:.75rem 1rem;background:#f1f5f9;border-radius:.5rem;password-box">${b.text ?? ""}</div>`;
    case "button":
      return `<a href="${b.url ?? ""}" style="display:inline-block;background:#4f46e5;color:#ffffff;padding:.75rem 1.25rem;border-radius:.5rem;text-decoration:none">${b.text ?? ""}</a>`;
    case "divider":
      return "<hr/>";
    case "html":
      return b.html ?? "";
    default:
      return "";
  }
}

export function emailBlocksToHtml(blocks: EmailBlock[]): string {
  return blocks.map(emailBlockToHtml).join("\n");
}

export function emailHtmlToBlocks(html: string): EmailBlock[] {
  const trimmed = html.trim();
  if (!trimmed) return [{ type: "paragraph", text: "" }];

  const re =
    /<(h1|p)([^>]*)>([\s\S]*?)<\/\1>|<a([^>]*)>([\s\S]*?)<\/a>|<hr[^>]*\/?>|<div[^>]*style="([^"]*password[^"]*)"[^>]*>([\s\S]*?)<\/div>/g;
  const blocks: EmailBlock[] = [];
  let consumed = 0;
  let matched = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(trimmed)) !== null) {
    matched = true;
    if (m.index > consumed) {
      const raw = trimmed.slice(consumed, m.index).trim();
      if (raw) blocks.push({ type: "html", html: raw });
    }
    if (m[1] === "h1") blocks.push({ type: "heading", text: m[3] });
    else if (m[1] === "p") blocks.push({ type: "paragraph", text: m[3] });
    else if (m[4] !== undefined) {
      const href = /href="([^"]*)"/.exec(m[4])?.[1] ?? "";
      blocks.push({ type: "button", text: m[5], url: href });
    } else if (m[6] !== undefined) blocks.push({ type: "password", text: m[7] });
    else blocks.push({ type: "divider" });
    consumed = re.lastIndex;
  }
  if (!matched) return [{ type: "html", html: trimmed }];
  if (consumed < trimmed.length) {
    const raw = trimmed.slice(consumed).trim();
    if (raw) blocks.push({ type: "html", html: raw });
  }
  return blocks;
}