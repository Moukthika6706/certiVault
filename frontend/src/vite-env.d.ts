/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional. Defaults to "/api" (same origin, routed by Vite proxy in dev and Nginx on EC2). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
