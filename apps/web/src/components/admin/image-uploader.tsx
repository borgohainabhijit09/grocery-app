"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ImageUploader({
  value,
  onChange,
  max = 8,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);

    const uploaded: string[] = [];
    for (const file of Array.from(files)) {
      if (value.length + uploaded.length >= max) {
        setError(`Maximum ${max} images.`);
        break;
      }
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Upload failed.");
        continue;
      }
      uploaded.push(data.url);
    }

    if (uploaded.length > 0) onChange([...value, ...uploaded]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {value.map((url) => (
          <div key={url} className="group relative size-24 overflow-hidden rounded-lg border">
            <Image src={url} alt="" fill sizes="96px" className="object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove image"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}

        {value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="grid size-24 place-items-center rounded-lg border border-dashed text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-xs">
                <Upload className="size-4" />
                Upload
              </span>
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading || value.length >= max}
        >
          Choose files
        </Button>
        <span className="text-xs text-muted-foreground">
          {value.length}/{max} · JPG, PNG, WEBP up to 5 MB
        </span>
      </div>
    </div>
  );
}
