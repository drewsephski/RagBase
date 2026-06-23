"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ALLOWED_FILE_EXTENSIONS } from "@/lib/domain/definitions";
import { cn } from "@/lib/utils";

interface FileInputRowProps {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

export function FileInputRow({ onUpload, disabled = false }: FileInputRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = ALLOWED_FILE_EXTENSIONS.join(",");

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);
      setFileName(file.name);

      try {
        await onUpload(file);
        setFileName("");
      } catch (uploadError) {
        setFileName("");
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Upload failed. Please try again.",
        );
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
      event.target.value = "";
    },
    [handleFile],
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <FileUp
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            readOnly
            value={isUploading ? "Uploading…" : fileName}
            placeholder="Upload PDF, Word, or text"
            disabled={disabled || isUploading}
            onClick={() => {
              if (!disabled && !isUploading) {
                inputRef.current?.click();
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (!disabled && !isUploading) {
                  inputRef.current?.click();
                }
              }
            }}
            className={cn(
              "cursor-pointer pl-9",
              (disabled || isUploading) && "cursor-not-allowed",
            )}
            aria-label="Upload a document"
          />
        </div>

        <Button
          type="button"
          variant="secondary"
          disabled={disabled || isUploading}
          className="w-full shrink-0 sm:w-auto"
          onClick={() => inputRef.current?.click()}
          aria-label="Choose file"
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            "Browse"
          )}
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          aria-hidden
          disabled={disabled || isUploading}
          onChange={handleInputChange}
        />
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
