/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NFT_CONTRACT_ADDRESS: string;
  readonly VITE_SUPPORT_EMAIL: string;
  // Add more environment variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
