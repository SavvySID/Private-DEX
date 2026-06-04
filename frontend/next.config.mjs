import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @cofhe/sdk pulls in the `tfhe` WASM build, which allocates a SHARED
 * `WebAssembly.Memory`. A shared memory requires `SharedArrayBuffer`, which the
 * browser only exposes when the page is "cross-origin isolated". Without these
 * headers the FHE key/CRS deserializes into garbage.
 *
 * COEP `credentialless` keeps third-party (no-cors) resources loadable in
 * Chromium while still achieving isolation. If you need broader browser support
 * you can switch this to `require-corp`.
 */
const crossOriginIsolationHeaders = [
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@cofhe/sdk", "tfhe", "node-tfhe"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: crossOriginIsolationHeaders,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    config.resolve.alias = {
      ...config.resolve.alias,
      "@react-native-async-storage/async-storage": path.join(__dirname, "async-storage-stub.js"),
    };
    if (!isServer) {
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
