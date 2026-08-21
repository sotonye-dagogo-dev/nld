"use client";

import { useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { renderTemplate, renderTemplateSubject, SAMPLE_EMAIL_VARIABLES } from "@/lib/email-render";
import {
  emailBlocksToHtml,
  emailHtmlToBlocks,
  EMAIL_BLOCK_LABELS,
  EMAIL_BLOCK_TYPES,
  type EmailBlock,
  type EmailBlockType,
} from "@/lib/email-blocks";

// Email template editor — superadmin only. Two editing modes:
//   - Blocks: structured visual builder (paragraph, heading, password box,
//     button, divider, raw HTML passthrough).
//   - HTML: raw body editor.
// Variable chips insert {{name}} placeholders; a live preview renders with
// sample values. Saves via POST /api/admin/email-templates.

function blocksToHtml(blocks: EmailBlock[]): string {
  return emailBlocksToHtml(blocks);
}

function htmlToBlocks(html: string): EmailBlock[] {
  return emailHtmlToBlocks(html);
}

export function EmailTemplateEditor({ templates }: { templates: EmailTemplate[] }) {
  const { toast } = useToast();
  const [selectedKey, setSelectedKey] = useState(templates[0]?.key ?? "");
  const [mode, setMode] = useState<"blocks" | "html">("blocks");
  const [name, setName] = useState(templates[0]?.name ?? "");
  const [subject, setSubject] = useState(templates[0]?.subject ?? "");
  const [bodyHtml, setBodyHtml] = useState(templates[0]?.bodyHtml ?? "");
  const [blocks, setBlocks] = useState<EmailBlock[]>(() =>
    htmlToBlocks(templates[0]?.bodyHtml ?? ""),
  );
  const [saving, setSaving] = useState(false);
  const htmlRef = useRef<HTMLTextAreaElement | null>(null);

  const current = templates.find((t) => t.key === selectedKey) ?? templates[0];
  const variableNames = Object.keys(current?.variables ?? {});

  const previewSubject = useMemo(
    () => renderTemplateSubject(subject, SAMPLE_EMAIL_VARIABLES),
    [subject],
  );
  const previewHtml = useMemo(
    () => renderTemplate(bodyHtml, SAMPLE_EMAIL_VARIABLES),
    [bodyHtml],
  );

  function selectTemplate(key: string) {
    const t = templates.find((x) => x.key === key);
    if (!t) return;
    setSelectedKey(key);
    setName(t.name);
    setSubject(t.subject);
    setBodyHtml(t.bodyHtml);
    setBlocks(htmlToBlocks(t.bodyHtml));
  }

  function updateBlock(index: number, patch: Partial<EmailBlock>) {
    const next = blocks.map((b, i) => (i === index ? { ...b, ...patch } : b));
    setBlocks(next);
    setBodyHtml(blocksToHtml(next));
  }

  function removeBlock(index: number) {
    const next = blocks.filter((_, i) => i !== index);
    setBlocks(next);
    setBodyHtml(blocksToHtml(next));
  }

  function addBlock(type: EmailBlockType) {
    const next = [...blocks, { type, text: "", url: "", html: "" }];
    setBlocks(next);
    setBodyHtml(blocksToHtml(next));
  }

  function insertVariable(variable: string) {
    const token = `{{${variable}}}`;
    if (mode === "html") {
      const el = htmlRef.current;
      if (el) {
        const start = el.selectionStart ?? bodyHtml.length;
        const end = el.selectionEnd ?? bodyHtml.length;
        const next = bodyHtml.slice(0, start) + token + bodyHtml.slice(end);
        setBodyHtml(next);
        requestAnimationFrame(() => {
          el.focus();
          const pos = start + token.length;
          el.setSelectionRange(pos, pos);
        });
      } else {
        setBodyHtml((prev) => prev + token);
      }
      return;
    }
    const next = [...blocks];
    // Append to the last text-bearing block (or add a paragraph).
    const target = [...next].reverse().find((b) => b.type !== "divider" && b.type !== "html");
    if (target) {
      const idx = next.indexOf(target);
      next[idx] = {
        ...target,
        text: `${target.text ?? ""}${token}`,
      };
    } else {
      next.push({ type: "paragraph", text: token });
    }
    setBlocks(next);
    setBodyHtml(blocksToHtml(next));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: selectedKey,
          name,
          subject,
          bodyHtml,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        toast(data.error ?? "Could not save the template.", "error");
        return;
      }
      toast("Template saved.", "success");
    } catch {
      toast("Network error while saving.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-text-primary">Template:</span>
        {templates.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => selectTemplate(t.key)}
            className={
              t.key === selectedKey
                ? "rounded-lg bg-primary px-3 py-1.5 text-sm text-white"
                : "rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-muted hover:bg-background"
            }
          >
            {t.name}
          </button>
        ))}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <Input
              name="templateName"
              label="Display name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="mt-4">
              <Input
                name="templateSubject"
                label="Subject line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="flex-between">
              <h2 className="text-sm font-semibold text-text-primary">Body</h2>
              <div className="flex gap-1 rounded-lg border border-border p-1">
                {(["blocks", "html"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={
                      mode === m
                        ? "rounded-md bg-primary px-3 py-1 text-xs text-white"
                        : "rounded-md px-3 py-1 text-xs text-text-muted hover:bg-background"
                    }
                  >
                    {m === "blocks" ? "Visual" : "HTML"}
                  </button>
                ))}
              </div>
            </div>

            {variableNames.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <span className="text-xs text-text-muted">Variables:</span>
                {variableNames.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="rounded-full border border-border bg-background px-2 py-0.5 font-mono text-xs text-text-muted hover:bg-primary/10 hover:text-primary"
                    title={current.variables[v]}
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            )}

            {mode === "html" ? (
              <textarea
                ref={htmlRef}
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                rows={16}
                className="w-full rounded-lg border border-border bg-surface p-3 font-mono text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            ) : (
              <div className="space-y-3">
                {blocks.map((b, i) => (
                  <div key={i} className="rounded-lg border border-border p-3">
                    <div className="flex-between mb-2">
                      <select
                        value={b.type}
                        onChange={(e) => {
                          const next = blocks.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  type: e.target.value as EmailBlockType,
                                  text: "",
                                  url: "",
                                  html: "",
                                }
                              : x,
                          );
                          setBlocks(next);
                          setBodyHtml(blocksToHtml(next));
                        }}
                        className="rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary"
                      >
                        {(Object.keys(EMAIL_BLOCK_LABELS) as EmailBlockType[]).map((t) => (
                          <option key={t} value={t}>
                            {EMAIL_BLOCK_LABELS[t]}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeBlock(i)}
                        className="rounded-lg px-2 py-1 text-xs text-text-muted hover:bg-background hover:text-danger"
                      >
                        Remove
                      </button>
                    </div>
                    {b.type === "html" ? (
                      <textarea
                        value={b.html ?? ""}
                        onChange={(e) => updateBlock(i, { html: e.target.value })}
                        rows={4}
                        className="w-full rounded-lg border border-border bg-surface p-2 font-mono text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      />
                    ) : b.type === "divider" ? (
                      <p className="text-center text-xs text-text-muted">Horizontal divider</p>
                    ) : (
                      <div className="space-y-2">
                        {b.type === "button" && (
                          <input
                            value={b.url ?? ""}
                            onChange={(e) => updateBlock(i, { url: e.target.value })}
                            placeholder="Link URL (e.g. {{inviteUrl}})"
                            className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          />
                        )}
                        <textarea
                          value={b.text ?? ""}
                          onChange={(e) => updateBlock(i, { text: e.target.value })}
                          placeholder={
                            b.type === "password"
                              ? "e.g. {{accessPassword}}"
                              : b.type === "button"
                              ? "Button label"
                              : "Text (use {{variable}} tokens)"
                          }
                          rows={2}
                          className="w-full rounded-lg border border-border bg-surface px-2 py-1 text-xs text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  {EMAIL_BLOCK_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => addBlock(t)}
                      className="rounded-lg border border-border bg-surface px-3 py-1 text-xs text-text-muted hover:bg-background"
                    >
                      + {EMAIL_BLOCK_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end border-t border-border pt-4">
              <Button onClick={save} loading={saving}>
                Save template
              </Button>
            </div>
          </Card>
        </div>

        <Card className="h-fit">
          <h2 className="mb-3 text-sm font-semibold text-text-primary">Live preview</h2>
          <p className="mb-4 rounded-lg bg-background px-3 py-2 text-sm font-medium text-text-primary">
            {previewSubject}
          </p>
          <div className="overflow-x-auto rounded-lg border border-border bg-white p-4 text-sm text-slate-900">
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
          <p className="mt-3 text-xs text-text-muted">
            Preview uses sample values. Sent emails use the real values from the
            purchase or invitation.
          </p>
        </Card>
      </div>
    </div>
  );
}