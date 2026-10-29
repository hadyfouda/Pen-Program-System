/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MS_TENANT_ID?: string;
  readonly VITE_MS_CLIENT_ID?: string;
  readonly VITE_MS_CLIENT_SECRET?: string;
  readonly VITE_MS_GRAPH_ACCESS_TOKEN?: string;
  readonly VITE_MS_EXCEL_FILE_ID?: string;
  readonly VITE_MS_UPLOAD_FOLDER_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
