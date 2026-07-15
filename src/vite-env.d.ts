/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional absolute base for Disclosure Mismatch API (default: /signals-api via Vite proxy) */
  readonly VITE_SIGNALS_API_URL?: string;
  /** Optional origin for SEC EDGAR proxy (GET /api/sec/*). Default: deployed dcim-api-worker. */
  readonly VITE_SEC_EDGAR_PROXY_URL?: string;
  /** Explicit demo-mode selection (R-F1): 'true' opens the demo namespace and enables seeding. */
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Asset module declarations
declare module '*.png' {
  const src: string;
  export default src;
}

declare module '*.jpg' {
  const src: string;
  export default src;
}

declare module '*.jpeg' {
  const src: string;
  export default src;
}

declare module '*.webp' {
  const src: string;
  export default src;
}

declare module '*.gif' {
  const src: string;
  export default src;
}

declare module '*.webm' {
  const src: string;
  export default src;
}

// Third-party packages without bundled types
declare module 'arima';
declare module 'slayer';





