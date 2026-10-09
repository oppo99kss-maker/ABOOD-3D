import { fileURLToPath } from "node:url";
const config = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
};
export default config;
