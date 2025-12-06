/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_ICON?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
