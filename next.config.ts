import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /**
       * Server Actions cap request bodies at 1MB by default, which is below the
       * 2MB an avatar upload is allowed to be (`AVATAR_MAX_BYTES`). Without
       * this the framework would reject a large picture before the action could
       * explain why, and the limit the form promises would not be the real one.
       *
       * The extra half megabyte is headroom for multipart overhead, which
       * counts towards this limit. Uploads are shrunk in the browser first, so
       * in practice they arrive at a few tens of kilobytes.
       */
      bodySizeLimit: "2.5mb",
    },
  },
};

export default nextConfig;
