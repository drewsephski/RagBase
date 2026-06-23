import { ImageResponse } from "next/og";
import {
  OgImageContent,
  ogImageAlt,
  ogImageSize,
} from "@/lib/domain/og-image-content";

export const alt = ogImageAlt;
export const size = ogImageSize;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<OgImageContent />, {
    ...ogImageSize,
  });
}
