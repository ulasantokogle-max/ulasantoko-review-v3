import type { MetadataRoute } from "next";
import { YUKREVIEW_SITE_URL } from "../lib/siteMetadata";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: YUKREVIEW_SITE_URL + "/sitemap.xml" };
}
