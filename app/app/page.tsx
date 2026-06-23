import type { Metadata } from "next";
import { App } from "@/app/ui/app";
import { SITE_NAME } from "@/lib/domain/site";
import { parseCheckoutReturnParams } from "@/lib/billing/checkout-return-state";

export const metadata: Metadata = {
  title: "Workspace",
  description: `Chat with your documents in ${SITE_NAME}.`,
  robots: {
    index: false,
    follow: true,
  },
};

interface AppPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AppPage({ searchParams }: AppPageProps) {
  const params = await searchParams;
  const checkoutReturn = parseCheckoutReturnParams(params);

  return <App checkoutReturn={checkoutReturn} />;
}
