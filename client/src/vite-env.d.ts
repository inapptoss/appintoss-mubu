/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FREE_SOFTWALL_AT?: string;
  readonly VITE_FREE_PAYWALL_AT?: string;
  readonly VITE_STRIPE_PUBLIC_KEY?: string;
  // 추가 환경변수가 있으면 여기에 정의
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
