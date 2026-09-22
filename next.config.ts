import type { NextConfig } from "next";

// Response headers for every route: pages, API routes, generated images and static files.
// HSTS is added by the hosting platform. There is deliberately no script-src policy: the
// consent bootstrap is inline and Turnstile is a security widget independent of
// analytics consent. Analytics loads only after acceptance. frame-ancestors
// governs embedding; it is not a script execution policy.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  images: {
    // Qualities the image optimizer may serve: 75 is what every <Image> here requests.
    qualities: [75, 90],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
