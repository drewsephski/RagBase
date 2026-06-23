"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUploadFileState } from "@/hooks/use-upload-file-state";
import { ALLOWED_FILE_EXTENSIONS } from "@/lib/domain/definitions";
import { pickInputFile } from "@/lib/ui/upload-file";
import { cn } from "@/lib/utils";

interface FileInputRowProps {
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

export function FileInputRow({ onUpload, disabled = false }: FileInputRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const { isUploading, error, runUpload } = useUploadFileState();

  const accept = ALLOWED_FILE_EXTENSIONS.join(",");

  const handleFile = useCallback(
    async (file: File) => {
      await runUpload(async () => {
        setFileName(file.name);
        await onUpload(file);
        setFileName("");
      });
    },
    [onUpload, runUpload],
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = pickInputFile(event);
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  return (
    <div className="space-y-2">
      <div className="ingest-composer rounded-2xl border p-1.5 sm:p-2">
        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
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
                "min-h-[2.5rem] cursor-pointer border-0 pl-9 shadow-none focus-visible:ring-1 sm:min-h-[2.75rem]",
                (disabled || isUploading) && "cursor-not-allowed",
              )}
              aria-label="Upload a document"
            />
          </div>

          <Button
            type="button"
            variant="secondary"
            disabled={disabled || isUploading}
            className="w-full shrink-0 rounded-xl sm:w-auto"
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
      </div>

      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
