import type { MetadataRoute } from "next";
import { YUKREVIEW_SITE_URL } from "../lib/siteMetadata";
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: YUKREVIEW_SITE_URL, changeFrequency: "monthly", priority: 1 }];
}
