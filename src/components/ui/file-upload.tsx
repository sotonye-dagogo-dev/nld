"use client";

import { useState, useCallback } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  value?: string;
  onChange: (url: string | undefined) => void;
  label?: string;
  accept?: string;
  type?: "cover" | "asset";
  disabled?: boolean;
  preview?: boolean;
}

export function FileUpload({ value, onChange, label, accept = "image/*", type = "cover", disabled = false, preview = true }: FileUploadProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/admin/assets", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Upload failed");
      }

      onChange(data.publicUrl);
      if (preview) setPreviewUrl(data.publicUrl);
      toast("Uploaded successfully", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed", "error");
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

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-primary">
        {label ?? (type === "cover" ? "Cover Image" : "Asset")}
      </label>
      <div className="relative">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={disabled || uploading}
          className="sr-only"
          id={`file-upload-${type}`}
        />
        <label
          htmlFor={`file-upload-${type}`}
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
                <Image
                  src={displayUrl}
                  alt="Preview"
                  width={200}
                  height={200}
                  className="max-h-32 max-w-full rounded-lg object-cover border border-border"
                />
              )}
              <span className="text-sm text-text-muted">
                {type === "cover" ? "Cover uploaded" : "Asset uploaded"}
              </span>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-text-muted" />
              <span className="text-sm text-text-muted">
                Click to upload {type === "cover" ? "cover image" : "asset"} (max 5MB)
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