import type { MetadataRoute } from "next";
import { APP_PATH, getSiteUrl } from "@/lib/domain/site";
import { TEMPLATE_LIST, getTemplateLandingPath } from "@/lib/domain/templates";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}${APP_PATH}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...TEMPLATE_LIST.map((template) => ({
      url: `${siteUrl}${getTemplateLandingPath(template.id)}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${siteUrl}/hospital-qi`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];
}
