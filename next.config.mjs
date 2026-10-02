/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow plain Node fetch — we use the runtime fetch with no caching layer;
  // ISR (`revalidate`) on individual pages does the caching.
  experimental: {
    // No appDir toggling in Next 14 — App Router is default.
  },
};

export default nextConfig;