"use client";

import { useCallback, useState } from "react";
import { getUploadErrorMessage } from "@/lib/ui/upload-file";

export function useUploadFileState() {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runUpload = useCallback(
    async (upload: () => Promise<void>) => {
      setError(null);
      setIsUploading(true);

      try {
        await upload();
      } catch (uploadError) {
        setError(getUploadErrorMessage(uploadError));
      } finally {
        setIsUploading(false);
      }
    },
    [],
  );

  return {
    isUploading,
    error,
    runUpload,
  };
}
