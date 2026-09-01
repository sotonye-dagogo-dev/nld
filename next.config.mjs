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
    ],
    // Allow unoptimized images for Supabase storage if optimization fails
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  async headers() {
    // Anti-screenshot / asset-protection default (admin-configurable at the app
    // layer): frame-busting + conservative sniffing header. Config-driven at
    // runtime via settings; the CSP below is a safe baseline.
    // Allow Supabase storage for images, PDF iframe loading, and fetch connections
    const csp = [
      "default-src 'self'",
      "img-src 'self' data: https://*.supabase.co https://*.supabase.in",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in",
      "frame-src 'self' https://*.supabase.co https://*.supabase.in",
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