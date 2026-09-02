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

function withLayoutTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [{ value: settings }, navData] = await Promise.all([
    getSiteSettings(),
    withLayoutTimeout(
      (async () => {
        const [pub, purch] = await Promise.all([
          getPublishedDevotionals(1, 100).catch(() => ({ rows: [] as Devotional[] })),
          getPurchasableDevotionals().catch(() => [] as Devotional[]),
        ]);
        return {
          devotionals: (pub as { rows: Devotional[] }).rows.map((d) => ({ slug: d.slug, title: d.title })),
          purchasable: purch as Devotional[],
        };
      })(),
      2500,
      { devotionals: [] as { slug: string; title: string }[], purchasable: [] as Devotional[] },
    ),
  ]);
  const currentYear = new Date().getFullYear();
  const devotionals = navData.devotionals;
  const purchasable = navData.purchasable;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Early non-blocking asset protection — runs before hydration only if admin-enabled; <1ms */}
        {settings.antiScreenshotEnabled && (
          <>
            <style
              dangerouslySetInnerHTML={{
                __html: `html[data-protected="true"]{ -webkit-user-select:none;user-select:none;-webkit-touch-callout:none }html.screenshot-blur body{filter:blur(18px);transition:filter 80ms ease-out}@media print{html[data-protected="true"] body{display:none}html[data-protected="true"]::after{content:"Printing disabled for protected content";display:block;text-align:center;padding:4rem 2rem;color:#64748b}}`,
              }}
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `(function(){try{var d=document;var h=document.documentElement;var block=function(e){var t=e.target;if(t&&t.closest&&t.closest("[data-allow-select]"))return;e.preventDefault()};d.addEventListener("contextmenu",block,{capture:true});d.addEventListener("copy",block,{capture:true});d.addEventListener("cut",block,{capture:true});d.addEventListener("dragstart",block,{capture:true});d.addEventListener("selectstart",block,{capture:true});d.addEventListener("keydown",function(e){var k=(e.key||"").toLowerCase();var m=e.ctrlKey||e.metaKey;if(k==="f12"||(m&&["s","p","c","u","a"].indexOf(k)>-1))e.preventDefault();if(k==="printscreen"){h.classList.add("screenshot-blur");setTimeout(function(){h.classList.remove("screenshot-blur")},800)}} ,{capture:true});d.addEventListener("visibilitychange",function(){if(d.visibilityState==="hidden")h.classList.add("screenshot-blur");else setTimeout(function(){h.classList.remove("screenshot-blur")},400)});h.setAttribute("data-protected","true")}catch(e){}})();`,
              }}
            />
          </>
        )}
      </head>
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