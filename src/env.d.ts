/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  /**
   * نطاق Plausible المُتتبَّع (مثال: "claudecode.no"). فارغ ⇒ السكربت معطّل.
   * BLUEPRINT §10 — تحليلات Plausible (Plausible Analytics — GDPR-friendly).
   */
  readonly PUBLIC_PLAUSIBLE_DOMAIN?: string;
  /**
   * رابط مثيل Plausible للاستضافة الذاتية. الافتراضي `https://plausible.io`.
   */
  readonly PUBLIC_PLAUSIBLE_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
