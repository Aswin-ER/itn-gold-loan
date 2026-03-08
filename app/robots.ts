import type { MetadataRoute } from "next";

const siteUrl = (() => {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) {
    return "https://itngoldloan.in";
  }
  const withProtocol = configured.startsWith("http://") || configured.startsWith("https://")
    ? configured
    : `https://${configured}`;
  return withProtocol.replace(/\/$/, "");
})();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
