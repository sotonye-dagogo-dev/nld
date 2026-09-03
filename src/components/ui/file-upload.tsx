"use client";

import { useState, useCallback, useId } from "react";
import { Upload, X, Loader2, FileText, FileImage } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
  hint?: string;
  accept?: string;
  type?: "cover" | "asset" | "sermon";
  disabled?: boolean;
  preview?: boolean;
}

function getAcceptType(type: FileUploadProps["type"]): string {
  switch (type) {
    case "cover":
      return "image/*";
    case "sermon":
    case "asset":
      return "image/*,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    default:
      return "image/*";
  }
}

function isImageUrl(url: string): boolean {
  return /\.(jpeg|jpg|png|webp|gif)(\?.*)?$/i.test(url);
}

function getFileIcon(url: string) {
  if (isImageUrl(url)) {
    return <FileImage className="h-8 w-8 text-primary" />;
  }
  return <FileText className="h-8 w-8 text-primary" />;
}

export function FileUpload({ value, onChange, label, hint, accept, type = "cover", disabled = false, preview = true }: FileUploadProps) {
  const effectiveAccept = accept ?? getAcceptType(type);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const uid = useId();

  const handleUpload = useCallback(async (file: File) => {
    const MAX_CLIENT_BYTES = 50 * 1024 * 1024;
    if (file.size > MAX_CLIENT_BYTES) {
      toast(`File too large — max 50MB (got ${(file.size / 1024 / 1024).toFixed(1)}MB).`, "error");
      return;
    }
    if (file.size === 0) {
      toast("Empty file.", "error");
      return;
    }
    setUploading(true);
    try {
      // Prefer direct-to-Supabase signed upload (bypasses Vercel 4.5MB limit)
      let publicUrl: string | null = null;
      let usedDirect = false;
      try {
        const signRes = await fetch("/api/admin/assets/sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, contentType: file.type || "application/octet-stream", type }),
        });
        const signCt = signRes.headers.get("content-type") ?? "";
        if (signCt.includes("application/json")) {
          const signData = (await signRes.json()) as { ok: boolean; signedUrl?: string; token?: string; publicUrl?: string; error?: string };
          if (signRes.ok && signData.ok && signData.signedUrl) {
            // Upload directly to Supabase Storage (bypass Vercel)
            // Supabase signedUrl is hosted on *.supabase.co — direct PUT bypasses Vercel payload limits
            const putRes = await fetch(signData.signedUrl, {
              method: "PUT",
              headers: {
                "Content-Type": file.type || "application/octet-stream",
                "x-upsert": "true",
              },
              body: file,
            });
            if (!putRes.ok) {
              const t = await putRes.text().catch(() => "");
              throw new Error(t.slice(0, 400) || `Direct upload failed (${putRes.status}).`);
            }
            publicUrl = signData.publicUrl ?? null;
            usedDirect = true;
          } else if (signData.error && !signData.signedUrl) {
            // Sign failed, fall through to legacy
            console.warn("[file-upload] sign failed, falling back to legacy:", signData.error);
          }
        }
      } catch (e) {
        console.warn("[file-upload] direct path failed, falling back to legacy:", e);
      }

      if (!usedDirect) {
        // Legacy path: proxy through Vercel (for small files or SDK fallback)
        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);
        const res = await fetch("/api/admin/assets", {
          method: "POST",
          body: formData,
        });
        let data: { ok: boolean; publicUrl?: string; error?: string };
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          try {
            data = (await res.json()) as typeof data;
          } catch {
            const text = await res.text().catch(() => "");
            throw new Error(text.slice(0, 400) || `Upload failed (${res.status}).`);
          }
        } else {
          const text = await res.text().catch(() => "");
          if (!res.ok) {
            if (res.status === 413 || text.toLowerCase().includes("payload") || text.toLowerCase().includes("too large") || text.includes("FUNCTION_PAYLOAD_TOO_LARGE")) {
              throw new Error(
                "File too large for Vercel's request limit (~4.5MB on hobby). Try a smaller file or ensure direct upload is enabled (Supabase signed URL).",
              );
            }
            throw new Error(text.slice(0, 400) || `Upload failed (${res.status} ${res.statusText}).`);
          }
          throw new Error(text.slice(0, 400) || "Upload failed: server returned non-JSON response.");
        }
        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? `Upload failed (${res.status}).`);
        }
        publicUrl = data.publicUrl ?? null;
      }

      if (!publicUrl) throw new Error("Upload succeeded but no URL returned.");
      onChange(publicUrl);
      if (preview) setPreviewUrl(publicUrl);
      toast("Uploaded successfully", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      if (msg.includes("Unexpected token") && (msg.includes("Request") || msg.includes("FUNCTION_PAYLOAD"))) {
        toast(
          "File too large for Vercel's request limit (~4.5MB on hobby). Direct upload will be used for 50MB files; if this persists check Supabase bucket and RLS.",
          "error",
        );
      } else {
        toast(msg, "error");
      }
    } finally {
      setUploading(false);
    }
  }, [onChange, preview, toast, type]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const handleRemove = () => {
    onChange(undefined);
    if (preview) setPreviewUrl(null);
    toast("Cover removed", "info");
  };

  const displayUrl = previewUrl ?? value;
  const isImage = displayUrl ? isImageUrl(displayUrl) : false;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        {label ?? (type === "cover" ? "Cover Image" : "Asset")}
      </label>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
      <div className="relative">
        <input
          type="file"
          accept={effectiveAccept}
          onChange={handleFileChange}
          disabled={disabled || uploading}
          className="sr-only"
          id={`file-upload-${type}-${uid}`}
        />
        <label
          htmlFor={`file-upload-${type}-${uid}`}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-surface p-6 cursor-pointer transition-colors",
            disabled && "opacity-50 cursor-not-allowed",
            !disabled && !uploading && "hover:border-primary hover:bg-background",
            uploading && "opacity-70",
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm text-text-muted">Uploading...</span>
            </>
          ) : displayUrl ? (
            <>
              {preview && (
                <div className="max-h-32 max-w-full rounded-lg border border-border flex items-center justify-center bg-background">
                  {isImage ? (
                    <Image
                      src={displayUrl}
                      alt="Preview"
                      width={200}
                      height={200}
                      className="max-h-32 max-w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 p-4 text-center">
                      {getFileIcon(displayUrl)}
                      <span className="text-xs text-text-muted truncate max-w-[200px]">
                        {displayUrl.split("/").pop()?.split(".").slice(0, -1).join(".") || "File"}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <span className="text-sm text-text-muted">
                {type === "cover" ? "Cover uploaded" : "Asset uploaded"}
              </span>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-text-muted" />
              <span className="text-sm text-text-muted">
                Click to upload {type === "cover" ? "cover image" : "asset"} (max 50MB)
              </span>
            </>
          )}
        </label>
        {(displayUrl || previewUrl) && !uploading && !disabled && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 right-2 rounded-full bg-danger/90 p-1 text-white hover:bg-danger transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
            aria-label="Remove"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}