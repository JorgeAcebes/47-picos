import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://atlas-log.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/picos", "/ranking", "/social", "/perfil/", "/terminos", "/privacidad"],
      disallow: ["/api/", "/reset-password"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
