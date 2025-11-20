/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HOSPITAL_ADDRESS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
