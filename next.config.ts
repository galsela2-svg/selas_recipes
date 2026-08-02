import type { NextConfig } from "next";

// Recipe images come from arbitrary external sites/Instagram (import) or our
// own Supabase Storage bucket (uploads) — every <img> in the app is a plain
// element rather than next/image, since a domain allowlist isn't practical
// without breaking imports from unlisted hosts.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
