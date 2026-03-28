import { isTokenValid, clearAuthData } from '../utils/auth';

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
  // Doctor Management service
  doctor: readEnv('VITE_DOCTOR_SERVICE_URL', 'http://localhost:8082'),
  // Appointment service (Spring Boot default in repo: 8080)
  appointment: readEnv('VITE_APPOINTMENT_SERVICE_URL', 'http://localhost:8080'),
  // Telemedicine service
  telemedicine: readEnv('VITE_TELEMEDICINE_SERVICE_URL', 'http://localhost:8083'),
  // Payment service
  payment: readEnv('VITE_PAYMENT_SERVICE_URL', 'http://localhost:8085'),
  // Notification service
  notification: readEnv('VITE_NOTIFICATION_SERVICE_URL', 'http://localhost:8086'),
}

// Debug: show configured service base URLs in dev
if (import.meta?.env?.DEV) {
  // eslint-disable-next-line no-console
  console.log('[API services]', services)
}

export const api = {
  authBase: readEnv('VITE_AUTH_BASE_URL', `${services.patient}/api/auth`),
}

export const apiBases = {
  telemedicine: readEnv('VITE_TELEMEDICINE_API_BASE', `${services.telemedicine}/api/telemedicine`),
  telemedSessions: readEnv('VITE_TELEMED_SESSIONS_API_BASE', `${services.telemedicine}/api/telemed`),
}

// Get auth token from localStorage
const getAuthToken = () => {
  const token = localStorage.getItem('auth_token');
  
  // Debug: Log token status
  if (token) {
    console.log('Token found:', token.substring(0, 20) + '...');
    console.log('Token parts:', token.split('.').length);
    
    // Validate token
    if (!isTokenValid(token)) {
      console.warn('Invalid or expired token, clearing...');
      clearAuthData();
      return null;
    }
  } else {
    console.log('No token found in localStorage');
  }
  
  return token;
};

// Utility to clear invalid tokens
export const clearInvalidTokens = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  console.log('Cleared invalid tokens from localStorage');
};

// Generic API client with authentication
const apiClient = async (url, options = {}) => {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Only add Authorization header if token exists and is valid
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const payload = isJson ? await response.json() : await response.text();
      const backendMessage = typeof payload === 'string'
        ? payload
        : payload?.message || payload?.error || response.statusText;

      if (response.status === 401) {
        // Token expired or invalid, clear storage and redirect to login
        clearAuthData();
        window.location.href = '/login';
        throw new Error('Authentication required');
      }
      const err = new Error(`HTTP ${response.status} calling ${url}: ${backendMessage}`);
      err.status = response.status;
      err.payload = payload;
      throw err;
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

const telemedicineClient = async (path, options = {}) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const base = apiBases.telemedicine.endsWith('/')
    ? apiBases.telemedicine.slice(0, -1)
    : apiBases.telemedicine
  return apiClient(`${base}${cleanPath}`, options)
}

const telemedSessionsClient = async (path, options = {}) => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  const base = apiBases.telemedSessions.endsWith('/')
    ? apiBases.telemedSessions.slice(0, -1)
    : apiBases.telemedSessions
  return apiClient(`${base}${cleanPath}`, options)
}

// API endpoints
export const API = {
  // Patient Management Endpoints
  patients: {
    getAll: () => apiClient(`${services.patient}/api/patient/all`),
    getProfile: () => apiClient(`${services.patient}/api/patient/profile`),
    updateProfile: (data) => apiClient(`${services.patient}/api/patient/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    getReports: () => apiClient(`${services.patient}/api/patient/reports`),
    getPrescriptions: () => apiClient(`${services.patient}/api/patient/prescriptions`),
  },

  // Doctor Management Endpoints
  doctors: {
    getAll: () => apiClient(`${services.doctor}/api/doctors`),
    getById: (id) => apiClient(`${services.doctor}/api/doctors/${id}`),
    getByEmail: (email) => apiClient(`${services.doctor}/api/doctors/email/${email}`),
    getBySpecialization: (specialization) => apiClient(`${services.doctor}/api/doctors/specialization/${specialization}`),
    update: (id, data) => apiClient(`${services.doctor}/api/doctors/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    delete: (id) => apiClient(`${services.doctor}/api/doctors/${id}`, {
      method: 'DELETE',
    }),
    verify: (id) => apiClient(`${services.doctor}/api/doctors/${id}/verify`, {
      method: 'POST',
    }),
    toggleStatus: (id) => apiClient(`${services.doctor}/api/doctors/${id}/toggle-status`, {
      method: 'POST',
    }),
    getMyProfile: () => apiClient(`${services.doctor}/api/doctors/me`),
    updateMyProfile: (data) => apiClient(`${services.doctor}/api/doctors/me`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },

  carePlans: {
    create: (payload) => apiClient(`${services.doctor}/api/care-plans`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    getByDoctor: (doctorId) => apiClient(`${services.doctor}/api/care-plans/doctor/${doctorId}`),
    getByDoctorAndPatient: (doctorId, patientId) =>
      apiClient(`${services.doctor}/api/care-plans/doctor/${doctorId}/patient/${patientId}`),
  },

  medicines: {
    getAll: () => apiClient(`${services.doctor}/api/medicines`),
    create: (payload) => apiClient(`${services.doctor}/api/medicines`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  },

  // Admin Endpoints
  admin: {
    getAllUsers: () => apiClient(`${services.patient}/api/admin/users`),
    updateUser: (id, data) => apiClient(`${services.patient}/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    deleteUser: (id) => apiClient(`${services.patient}/api/admin/users/${id}`, {
      method: 'DELETE',
    }),
    getTransactions: () => apiClient(`${services.patient}/api/admin/transactions`),
  },

  telemedicine: {
    // Session endpoints
    createSession: (appointmentId) => telemedicineClient(`/session/${appointmentId}`, { method: 'POST' }),
    createPatientSession: (patientId) => telemedicineClient(`/session/patient/${patientId}`, { method: 'POST' }),
    createDirectSession: (data) => telemedicineClient('/session/direct', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    joinSession: (appointmentId) => telemedicineClient(`/session/${appointmentId}/join`),
    endSession: (appointmentId) => telemedicineClient(`/session/${appointmentId}/end`, { method: 'POST' }),
    getSession: (appointmentId) => telemedicineClient(`/session/${appointmentId}`),

    // Consultations
    createConsultation: ({ doctorId, patientId }) => telemedicineClient('/consultations', {
      method: 'POST',
      body: JSON.stringify({ doctorId, patientId }),
    }),
    scheduleConsultation: ({ doctorId, patientId, scheduledAt }) => telemedicineClient('/consultations/schedule', {
      method: 'POST',
      body: JSON.stringify({ doctorId, patientId, scheduledAt }),
    }),
    answerConsultation: (consultationId) => telemedicineClient(`/consultations/${consultationId}/answer`, { method: 'POST' }),
    declineConsultation: (consultationId) => telemedicineClient(`/consultations/${consultationId}/decline`, { method: 'POST' }),
    endConsultation: (consultationId) => telemedicineClient(`/consultations/${consultationId}/end`, { method: 'POST' }),
    getConsultation: (consultationId) => telemedicineClient(`/consultations/${consultationId}`),
    listForPatient: (patientId) => telemedicineClient(`/consultations/patient/${patientId}`),
    listForDoctor: (doctorId) => telemedicineClient(`/consultations/doctor/${doctorId}`),
  },

  telemedSessions: {
    createOrGetByAppointment: (appointmentId, data = {}) =>
      telemedSessionsClient(`/appointments/${appointmentId}/session`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getByAppointment: (appointmentId) => telemedSessionsClient(`/appointments/${appointmentId}/session`),
    endByAppointment: (appointmentId, data = {}) =>
      telemedSessionsClient(`/appointments/${appointmentId}/end`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    listForDoctor: (doctorId) => telemedSessionsClient(`/doctor/${doctorId}/sessions`),
    listForPatient: (patientId) => telemedSessionsClient(`/patient/${patientId}/sessions`),
  },

  // Auth Endpoints
  auth: {
    login: (credentials) => apiClient(`${services.patient}/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
    register: (userData) => apiClient(`${services.patient}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  },

  
};

export default API;
