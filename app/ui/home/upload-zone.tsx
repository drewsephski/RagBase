"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ALLOWED_FILE_EXTENSIONS } from "@/lib/domain/definitions";

interface UploadZoneProps {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
  compact?: boolean;
}

export function UploadZone({
  onUpload,
  disabled = false,
  compact = false,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = ALLOWED_FILE_EXTENSIONS.join(",");

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setIsUploading(true);

      try {
        await onUpload(file);
      } catch (uploadError) {
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

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);

      if (disabled || isUploading) {
        return;
      }

      const file = event.dataTransfer.files[0];
      if (file) {
        void handleFile(file);
      }
    },
    [disabled, handleFile, isUploading],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (!disabled && !isUploading) {
        setIsDragging(true);
      }
    },
    [disabled, isUploading],
  );

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

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

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        inputRef.current?.click();
      }
    },
    [],
  );

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled || isUploading ? -1 : 0}
        aria-label="Upload a document by dragging a file here or clicking to browse"
        aria-disabled={disabled || isUploading}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onKeyDown={handleKeyDown}
        onClick={() => {
          if (!disabled && !isUploading) {
            inputRef.current?.click();
          }
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          compact ? "gap-1.5 px-3 py-4 sm:gap-2 sm:px-4 sm:py-6" : "gap-2 px-4 py-8 sm:gap-3 sm:px-6 sm:py-10",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/50 hover:bg-muted/30",
          (disabled || isUploading) && "pointer-events-none opacity-60",
        )}
      >
        {isUploading ? (
          <Loader2
            className="text-muted-foreground size-6 animate-spin sm:size-8"
            aria-hidden
          />
        ) : (
          <FileUp className="text-muted-foreground size-6 sm:size-8" aria-hidden />
        )}

        <div className="text-center">
          <p className={cn("font-medium", compact ? "text-xs sm:text-sm" : "text-sm sm:text-base")}>
            {isUploading ? "Uploading…" : "Drop a file here"}
          </p>
          <p className="text-muted-foreground mt-0.5 text-[11px] sm:mt-1 sm:text-xs md:text-sm">
            PDF, Word, text, or Markdown · up to 10 MB
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled || isUploading}
          onClick={(event) => {
            event.stopPropagation();
            inputRef.current?.click();
          }}
        >
          Browse files
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
