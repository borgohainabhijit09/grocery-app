import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://grocery-app.sygmiainnovative.co.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/shop", "/product/", "/category/"],
        disallow: ["/admin/", "/api/", "/account/", "/checkout/", "/cart"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
