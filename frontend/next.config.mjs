import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** One CJS entry so Next does not load both `web.mjs` and `web.js` (duplicate cofhejs zustand store → encrypt thinks it was never initialized). */
const cofheWeb = path.resolve(__dirname, "node_modules/cofhejs/dist/web.js");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["cofhejs", "tfhe", "node-tfhe"],
  webpack: (config, { isServer }) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": path.join(__dirname, "async-storage-stub.js"),
    };
    if (!isServer) {
      config.resolve.alias["cofhejs/web"] = cofheWeb;
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;
