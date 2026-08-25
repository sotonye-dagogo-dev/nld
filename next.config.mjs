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
    ],
  },
  async headers() {
    // Anti-screenshot / asset-protection default (admin-configurable at the app
    // layer): frame-busting + conservative sniffing header. Config-driven at
    // runtime via settings; the CSP below is a safe baseline.
    return [
      {
        source: "/devotionals/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "default-src 'self'; img-src 'self' data: https://*.supabase.co; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'" },
        ],
      },
    ];
  },
};

export default nextConfig;