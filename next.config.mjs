/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@floating-ui/react",
    "@floating-ui/react-dom",
    "@floating-ui/dom",
    "@floating-ui/core",
    "@floating-ui/utils",
  ],
  webpack: (config) => {
    // PDF.js worker is loaded from CDN, so we tell webpack to ignore the
    // worker import that pdfjs-dist may attempt to resolve at build time.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default nextConfig;
