import type { Metadata } from "next";
import { getSiteSettings } from "@/config/site";

// Global metadata generator for SEO
// Defaults to logo URL for favicon and og:image; devotional pages override with cover image

export async function generateGlobalMetadata(
  overrides: Partial<Metadata> = {},
  devotionalCoverUrl?: string
): Promise<Metadata> {
  const { value: settings } = await getSiteSettings();
  
  const defaultImage = devotionalCoverUrl || settings.logoUrl || "/favicon.ico";
  const defaultFavicon = settings.logoUrl || "/favicon.ico";

  return {
    title: {
      default: settings.platformName,
      template: `%s | ${settings.platformName}`,
    },
    description: settings.tagline || "Daily devotionals for your walk with God",
    manifest: "/manifest.json",
    appleWebApp: { capable: true, statusBarStyle: "default", title: settings.platformName },
    icons: {
      icon: defaultFavicon,
      shortcut: defaultFavicon,
      apple: defaultFavicon,
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: settings.platformName,
      title: settings.platformName,
      description: settings.tagline || "Daily devotionals for your walk with God",
      images: [
        {
          url: defaultImage,
          width: 1200,
          height: 630,
          alt: settings.platformName,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: settings.platformName,
      description: settings.tagline || "Daily devotionals for your walk with God",
      images: [defaultImage],
    },
    robots: {
      index: true,
      follow: true,
    },
    ...overrides,
  };
}

export function generateDevotionalMetadata(
  devotional: {
    title: string;
    subtitle?: string | null;
    coverUrl?: string | null;
    description?: string | null;
    slug: string;
  },
  settings: Awaited<ReturnType<typeof getSiteSettings>>["value"]
): Metadata {
  const image = devotional.coverUrl || settings.logoUrl || "/favicon.ico";

  return {
    title: devotional.title,
    description: devotional.description || devotional.subtitle || `Read ${devotional.title} devotional`,
    openGraph: {
      type: "article",
      locale: "en_US",
      siteName: settings.platformName,
      title: devotional.title,
      description: devotional.description || devotional.subtitle || `Read ${devotional.title} devotional`,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: devotional.title,
        },
      ],
      publishedTime: new Date().toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: devotional.title,
      description: devotional.description || devotional.subtitle || `Read ${devotional.title} devotional`,
      images: [image],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}