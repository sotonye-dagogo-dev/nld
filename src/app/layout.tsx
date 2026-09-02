import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { BackToTop } from "@/components/ui/back-to-top";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { getSiteSettings } from "@/config/site";
import { getPublishedDevotionals, getPurchasableDevotionals } from "@/lib/catalog";
import { ErrorBoundaryProvider } from "@/components/ui/error-boundary-provider";
import { generateGlobalMetadata } from "@/lib/metadata";
import { ClientNav } from "@/components/layout/client-nav";

export const metadataBase = new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");
export const metadata: Promise<Metadata> = generateGlobalMetadata();

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { value: settings } = await getSiteSettings();
  const currentYear = new Date().getFullYear();
  let devotionals: { slug: string; title: string }[] = [];
  let purchasable: Devotional[] = [];
  try {
    const [pub, purch] = await Promise.all([
      getPublishedDevotionals(1, 100).catch(() => ({ rows: [] as Devotional[] })),
      getPurchasableDevotionals().catch(() => [] as Devotional[]),
    ]);
    devotionals = (pub as { rows: Devotional[] }).rows.map((d) => ({ slug: d.slug, title: d.title }));
    purchasable = purch as Devotional[];
  } catch {
    // degrade gracefully
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ToastProvider>
          <ErrorBoundaryProvider>
            <ServiceWorkerRegistration />
            <div className="flex min-h-screen flex-col bg-background">
              <ClientNav
                platformName={settings.platformName}
                logoUrl={settings.logoUrl}
                settings={settings}
                devotionals={devotionals}
                purchasable={purchasable}
              />
              <main className="flex-1">{children}</main>
              <footer className="border-t border-border py-6 text-center text-sm text-text-muted">
                <p>© {currentYear} {settings.platformName}</p>
                {settings.footerDevCreditEnabled && settings.footerDevCreditName && (
                  <p className="mt-2">
                    Built by{" "}
                    <a
                      href={settings.footerDevCreditUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-primary transition-colors"
                    >
                      {settings.footerDevCreditName}
                    </a>
                  </p>
                )}
              </footer>
            </div>
            <BackToTop />
          </ErrorBoundaryProvider>
        </ToastProvider>
      </body>
    </html>
  );
}