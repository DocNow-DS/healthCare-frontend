// Centralized API configuration for microservices.
// Configure via Vite env vars (VITE_*). Example: VITE_PATIENT_SERVICE_URL=http://localhost:8081

const readEnv = (key, fallback) => {
  const value = import.meta.env?.[key]
  if (typeof value === 'string' && value.trim().length > 0) return value.trim()
  return fallback
}

export const services = {
  // Patient Management / Auth service
  patient: readEnv('VITE_PATIENT_SERVICE_URL', 'http://localhost:8081'),
}

export const api = {
  authBase: `${services.patient}/api/auth`,
}
