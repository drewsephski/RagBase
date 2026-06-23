"use client";

import { useCallback, useState } from "react";
import type { Source } from "@/lib/domain/definitions";
import { apiFetch, apiJson, ApiError } from "@/lib/api/client";
import type { WorkspaceHeaders } from "@/lib/api/types";
import { trackEvent } from "@/lib/analytics/track";
import { trackPaidIntent } from "@/lib/analytics/paid-intent";
import { trackLimitBoundary } from "@/lib/analytics/limit-boundary";
import { isRootUrl } from "@/lib/ingestion/url-utils";
import { getOpenRouterKey } from "@/lib/openrouter/client-key";

interface UrlIngestResult {
  source?: Source;
  teaser?: boolean;
  message?: string;
  notice?: string;
  url?: string;
}

interface UseIngestionOptions {
  headers: WorkspaceHeaders | null;
  isProActive?: boolean;
  onIngestionSuccess: () => void | Promise<void>;
}

export function useIngestion({
  headers,
  isProActive = false,
  onIngestionSuccess,
}: UseIngestionOptions) {
  const [urlChoiceOpen, setUrlChoiceOpen] = useState(false);
  const [pendingRootUrl, setPendingRootUrl] = useState<string | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [paywallPendingUrl, setPaywallPendingUrl] = useState<
    string | undefined
  >();
  const [paywallSurface, setPaywallSurface] = useState("paywall_dialog");

  const notifySuccess = useCallback(async () => {
    await onIngestionSuccess();
  }, [onIngestionSuccess]);

  const upload = useCallback(
    async (file: File) => {
      if (!headers) {
        throw new Error("Workspace is not ready yet.");
      }

      const formData = new FormData();
      formData.append("file", file);

      const openRouterKey = getOpenRouterKey();
      if (openRouterKey) {
        formData.append("openRouterKey", openRouterKey);
      }

      const response = await apiFetch("/api/sources/upload", {
        method: "POST",
        body: formData,
        workspaceHeaders: headers,
      });

      if (!response.ok) {
        let message = "Upload failed. Please try again.";
        try {
          const body = (await response.json()) as { error?: string };
          if (body.error) {
            message = body.error;
          }
        } catch {
          // ignore
        }
        const apiError = new ApiError(message, response.status);
        trackLimitBoundary(apiError);
        throw apiError;
      }

      trackEvent("file_uploaded", {
        extension: file.name.split(".").pop()?.toLowerCase() ?? "unknown",
      });

      await notifySuccess();
    },
    [headers, notifySuccess],
  );

  const submitUrl = useCallback(
    async (url: string): Promise<UrlIngestResult | void> => {
      if (!headers) {
        throw new Error("Workspace is not ready yet.");
      }

      const data = await apiJson<UrlIngestResult>("/api/sources/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        workspaceHeaders: headers,
      });

      trackEvent("url_ingested", {
        is_homepage: Boolean(data.notice),
      });

      await notifySuccess();
      return data;
    },
    [headers, notifySuccess],
  );

  const submitCrawl = useCallback(
    async (url: string) => {
      if (!headers) {
        throw new Error("Workspace is not ready yet.");
      }

      const data = await apiJson<{ source: Source }>("/api/sources/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        workspaceHeaders: headers,
      });

      trackEvent("crawl_started", {
        is_homepage: isRootUrl(url),
      });
      trackPaidIntent("full_site_crawl", { surface: "pro_crawl" });

      await notifySuccess();
      return data;
    },
    [headers, notifySuccess],
  );

  const submitUrlWithChoice = useCallback(
    async (url: string) => {
      try {
        if (isRootUrl(url)) {
          setPendingRootUrl(url);
          setUrlChoiceOpen(true);
          return;
        }

        return await submitUrl(url);
      } catch (error) {
        if (error instanceof ApiError) {
          trackLimitBoundary(error);
        }
        throw error;
      }
    },
    [submitUrl],
  );

  const submitSinglePage = useCallback(
    async (url: string) => {
      try {
        return await submitUrl(url);
      } catch (error) {
        if (error instanceof ApiError) {
          trackLimitBoundary(error);
        }
        throw error;
      }
    },
    [submitUrl],
  );

  const openFullSitePaywall = useCallback(
    (url?: string, surface = "crawl_hint") => {
      trackPaidIntent("full_site_crawl", { surface });
      setPaywallSurface(surface);
      setPaywallPendingUrl(url);
      setPaywallOpen(true);
    },
    [],
  );

  const handleRootUrlCrawlSite = useCallback(
    (url: string) => {
      if (isProActive) {
        void submitCrawl(url).catch((error) => {
          if (error instanceof ApiError) {
            trackLimitBoundary(error);
          }
        });
        return;
      }

      openFullSitePaywall(url, "root_url_choice");
    },
    [isProActive, openFullSitePaywall, submitCrawl],
  );

  const handlePaywallAddPageOnly = useCallback(() => {
    if (!paywallPendingUrl) {
      return;
    }

    void submitSinglePage(paywallPendingUrl);
  }, [paywallPendingUrl, submitSinglePage]);

  return {
    upload,
    submitUrl,
    submitCrawl,
    submitUrlWithChoice,
    submitSinglePage,
    urlChoiceOpen,
    setUrlChoiceOpen,
    pendingRootUrl,
    paywallOpen,
    setPaywallOpen,
    paywallPendingUrl,
    paywallSurface,
    openFullSitePaywall,
    handlePaywallAddPageOnly,
    handleRootUrlCrawlSite,
  };
}
