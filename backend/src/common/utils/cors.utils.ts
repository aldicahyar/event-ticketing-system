const DEV_FALLBACK_ORIGIN = 'http://localhost:3001';
const SAFE_HTTPS_ORIGIN = /^https:\/\/[^*\s/]+$/;

// ponytail: whitelist origin literal saja (tanpa pola subdomain). Kalau nanti butuh
// preview deploy dinamis (mis. *.vercel.app), ganti array ini dengan callback
// validator yang mem-parse hostname — jangan pakai regex mentah pada string origin.
export function resolveCorsOrigins(raw: string | undefined, nodeEnv: string): string[] {
  const origins = (raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (nodeEnv !== 'production') {
    return origins.length > 0 ? origins : [DEV_FALLBACK_ORIGIN];
  }

  if (origins.length === 0) {
    throw new Error(
      'CORS_ORIGIN wajib diisi di production: daftar origin https dipisah koma.',
    );
  }

  const invalid = origins.filter((origin) => !SAFE_HTTPS_ORIGIN.test(origin));
  if (invalid.length > 0) {
    throw new Error(
      `CORS_ORIGIN production harus https tanpa wildcard/path. Tidak valid: ${invalid.join(', ')}`,
    );
  }

  return origins;
}
