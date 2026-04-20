export function normalizeDocumentUrl(rawUrl) {
  if (typeof rawUrl !== 'string' || !rawUrl.trim()) return '';

  let value = rawUrl.trim();

  if (value.startsWith('/api/')) {
    const patientServiceUrl = import.meta.env?.VITE_PATIENT_SERVICE_URL || 'http://localhost:8081';
    const base = patientServiceUrl.endsWith('/') ? patientServiceUrl.slice(0, -1) : patientServiceUrl;
    return base + value;
  }

  // Repair malformed hostnames from previous normalization (storage.storage.supabase.co).
  value = value.replace('.storage.storage.supabase.co', '.storage.supabase.co');

  try {
    const parsed = new URL(value);
    const host = parsed.hostname;
    if (host.endsWith('.supabase.co') && !host.endsWith('.storage.supabase.co')) {
      parsed.hostname = host.replace(/\.supabase\.co$/, '.storage.supabase.co');
      value = parsed.toString();
    }
  } catch {
    // Keep best-effort string normalization when URL parsing fails.
  }

  // Legacy links may use the project host instead of storage host.
  value = value.replace(/(?<!\.storage)\.supabase\.co(?=\/storage\/v1\/)/, '.storage.supabase.co');

  // Legacy links may point to S3-compatible paths that do not map to direct object URLs.
  value = value.replace('/storage/v1/s3/object/public/', '/storage/v1/object/public/');
  value = value.replace('/storage/v1/s3/object/', '/storage/v1/object/');

  return value;
}
