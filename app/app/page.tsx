import type { Metadata } from "next";
import { App } from "@/app/ui/app";
import { SITE_NAME } from "@/app/lib/site";

export const metadata: Metadata = {
  title: "Workspace",
  description: `Chat with your documents in ${SITE_NAME}.`,
  robots: {
    index: false,
    follow: true,
  },
};

export default function AppPage() {
  return <App />;
}
