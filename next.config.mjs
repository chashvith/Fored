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
};

export default nextConfig;
