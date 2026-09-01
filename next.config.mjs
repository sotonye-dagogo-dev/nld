/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
      // External cover URLs (admin-pasted) — gstatic is used in seed data;
      // keep wide to avoid RSC digest crash for any https coverUrl.
      {
        protocol: "https",
        hostname: "**.gstatic.com",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "**.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "**.supabase.in",
      },
    ],
    // Allow unoptimized images for Supabase storage if optimization fails
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    // Anti-screenshot / asset-protection default (admin-configurable at the app
    // layer): frame-busting + conservative sniffing header. Config-driven at
    // runtime via settings; the CSP below is a safe baseline.
    // img-src must allow external cover URLs (admin can paste any https image);
    // gstatic appears in current seed data and is explicitly needed.
    const csp = [
      "default-src 'self'",
      "img-src 'self' data: blob: https: https://*.supabase.co https://*.supabase.in https://*.gstatic.com https://*.googleusercontent.com",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in https:",
      "frame-src 'self' https://*.supabase.co https://*.supabase.in https:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "font-src 'self' data:",
    ].join("; ");

    return [
      {
        source: "/devotionals/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
      // Apply same CSP to access page for PDF viewing
      {
        source: "/access/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
      // Apply CSP to purchase page for any embedded content
      {
        source: "/purchase/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;