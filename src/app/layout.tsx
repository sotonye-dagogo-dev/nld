import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { Navbar } from "@/components/ui/navbar";
import { BackToTop } from "@/components/ui/back-to-top";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { getSiteSettings } from "@/config/site";
import { ErrorBoundaryProvider } from "@/components/ui/error-boundary-provider";

export const metadata: Metadata = {
  title: "Next Level Devotional",
  description: "Daily devotionals for your walk with God",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Next Level Devotional" },
};

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

  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ToastProvider>
          <ErrorBoundaryProvider>
            <ServiceWorkerRegistration />
            <div className="flex min-h-screen flex-col bg-background">
              <Navbar
                platformName={settings.platformName}
                logoUrl={settings.logoUrl}
                links={[{ href: "/", label: "Devotionals" }]}
                trailing={
                  <a
                    href="/admin"
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-text-muted hover:bg-background"
                  >
                    Admin
                  </a>
                }
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