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
  notification: readEnv('VITE_NOTIFICATION_SERVICE_URL', 'http://localhost:8084'),
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

const readAuthUser = () => {
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getCurrentPatientId = () => {
  const user = readAuthUser();
  const id = user?.id || user?.userId || user?.username || user?.email;
  return id != null ? String(id).trim() : '';
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
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    ...options.headers,
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  // Only add Authorization header if token exists and is valid
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  try {
    // Dev debug: log request details before sending
    if (import.meta?.env?.DEV) {
      // eslint-disable-next-line no-console
      console.log('[API] REQUEST', { url, config: { method: config.method || 'GET', headers: config.headers } });
    }
    const response = await fetch(url, config);

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = isJson ? JSON.parse(text) : text;
      } catch {
        payload = text;
      }
    }


    if (!response.ok) {
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

    // Dev debug: log successful responses
    if (import.meta?.env?.DEV) {
      // eslint-disable-next-line no-console
      console.log('[API] RESPONSE', { url, status: response.status, payload });
    }

    return payload;

  } catch (error) {
    const message = String(error?.message || '');
    if (
      error?.name === 'TypeError' ||
      /NetworkError|Failed to fetch|fetch resource/i.test(message)
    ) {
      const networkErr = new Error('Network error. A backend service is unavailable or blocked by CORS.');
      networkErr.isNetworkError = true;
      networkErr.requestUrl = url;
      networkErr.cause = error;
      console.error('API Error:', networkErr);
      throw networkErr;
    }
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
    getById: (id) => apiClient(`${services.patient}/api/patient/${encodeURIComponent(String(id))}`),
    getProfile: () => apiClient(`${services.patient}/api/patient/profile`),
    updateProfile: (data) => apiClient(`${services.patient}/api/patient/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    getReports: () => apiClient(`${services.patient}/api/patient/reports`),
    getReportsByPatientId: (id) => apiClient(`${services.patient}/api/patient/${encodeURIComponent(String(id))}/reports`),
    uploadReport: (file, description = '') => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', description);
      return apiClient(`${services.patient}/api/patient/reports`, {
        method: 'POST',
        body: formData,
      });
    },
    getPrescriptions: () => apiClient(`${services.patient}/api/patient/prescriptions`),
    getPrescriptionsByPatientId: (id) =>
      apiClient(`${services.patient}/api/patient/${encodeURIComponent(String(id))}/prescriptions`),
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
    getByPatient: (patientId) => apiClient(`${services.doctor}/api/care-plans/patient/${patientId}`),
    getByDoctorAndPatient: (doctorId, patientId) =>
      apiClient(`${services.doctor}/api/care-plans/doctor/${doctorId}/patient/${patientId}`),
    // Internal endpoint used after successful payment to mark a bill inactive/completed.
    markPaidInternal: (carePlanId) =>
      apiClient(`${services.doctor}/api/internal/care-plans/${encodeURIComponent(String(carePlanId))}/mark-paid`, {
        method: 'POST',
      }),
  },

  medicines: {
    getAll: () => apiClient(`${services.doctor}/api/medicines`),
    create: (payload) => apiClient(`${services.doctor}/api/medicines`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    update: (id, payload) => apiClient(`${services.doctor}/api/medicines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  },

  preVisitServices: {
    getAll: () => apiClient(`${services.doctor}/api/pre-visit-services`),
    create: (payload) => apiClient(`${services.doctor}/api/pre-visit-services`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    update: (id, payload) => apiClient(`${services.doctor}/api/pre-visit-services/${id}`, {
      method: 'PUT',
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
    getUserById: (id) => apiClient(`${services.patient}/api/auth/users/${encodeURIComponent(String(id))}`),
    updateUserById: (id, data) => apiClient(`${services.patient}/api/auth/users/${encodeURIComponent(String(id))}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  },

  // Notification Endpoints
  notifications: {
    // Get current user's notifications (extracts username from token)
    getMyNotifications: (userType = 'PATIENT') => apiClient(`${services.notification}/api/notifications/me?userType=${userType}`),
    // Get current user's unread notifications
    getMyUnread: (userType = 'PATIENT') => apiClient(`${services.notification}/api/notifications/me/unread?userType=${userType}`),
    // Get current user's unread count
    getMyUnreadCount: (userType = 'PATIENT') => apiClient(`${services.notification}/api/notifications/me/unread/count?userType=${userType}`),
    // Mark all notifications as read
    markAllAsRead: (userType = 'PATIENT') => apiClient(`${services.notification}/api/notifications/me/read-all?userType=${userType}`, {
      method: 'PUT',
    }),
    // Mark a single notification as read
    markAsRead: (notificationId) => apiClient(`${services.notification}/api/notifications/${notificationId}/read`, {
      method: 'PUT',
    }),
    // Delete a notification
    delete: (notificationId) => apiClient(`${services.notification}/api/notifications/${notificationId}`, {
      method: 'DELETE',
    }),
  },

  // Payment Endpoints
  payment: {
    // Create Stripe checkout session
    createCheckoutSession: (data) => apiClient(`${services.payment}/api/v1/payments/checkout-session`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    // Get payment by ID
    getPayment: (paymentId) => apiClient(`${services.payment}/api/v1/payments/${paymentId}`),
    // Get payment by consultation ID
    getPaymentByConsultation: (consultationId) => apiClient(`${services.payment}/api/v1/payments/consultation/${consultationId}`),
    // Get payment by Stripe checkout session ID
    getPaymentBySession: (sessionId) => apiClient(`${services.payment}/api/v1/payments/session/${sessionId}`),
    // Confirm payment status with provider after redirect
    confirmPaymentSession: (sessionId) => apiClient(`${services.payment}/api/v1/payments/session/${sessionId}/confirm`, {
      method: 'POST',
    }),
    // Get all payments for current patient
    getMyPayments: () => apiClient(`${services.payment}/api/v1/payments/patient/my-payments`),
  },


  patientAppointments: {
    /** Requires patient JWT; returns appointments for the authenticated user. */
    list: async () => {
      let primaryError;
      try {
        return await apiClient(`${services.appointment}/api/patient/appointments`, {
          method: 'GET',
        });
      } catch (error) {
        primaryError = error;
        const patientId = getCurrentPatientId();
        if (!patientId) throw error;

        try {
          // Fallback: derive appointment-like rows from telemed sessions when appointment service is unavailable.
          const sessions = await telemedSessionsClient(`/patient/${encodeURIComponent(patientId)}/sessions`);
          const safeSessions = Array.isArray(sessions) ? sessions : [];
          return safeSessions.map((s) => ({
            id: s?.id || s?.consultationId || s?.appointmentId,
            doctorId: s?.doctorId || '',
            startTime: s?.startedAt || s?.createdAt || null,
            endTime: s?.endedAt || null,
            consultationType: s?.type || 'ONLINE',
            status: String(s?.status || 'SCHEDULED').toUpperCase(),
            notes: s?.notes || '',
            progressPercent: typeof s?.progressPercent === 'number' ? s.progressPercent : 0,
            progressLabel: s?.progressLabel || '',
          }));
        } catch (fallbackError) {
          const unavailable = new Error(
            'Appointments are temporarily unavailable. Please ensure the Appointment and Telemedicine services are running, then try again.'
          );
          unavailable.primaryError = primaryError;
          unavailable.fallbackError = fallbackError;
          unavailable.isServiceUnavailable = true;
          throw unavailable;
        }
      }
    },
    cancel: (appointmentId) =>
      apiClient(
        `${services.appointment}/api/patient/appointments/${encodeURIComponent(String(appointmentId))}/cancel`,
        { method: 'PATCH' },
      ),
    delete: (appointmentId) =>
      apiClient(
        `${services.appointment}/api/patient/appointments/${encodeURIComponent(String(appointmentId))}`,
        { method: 'DELETE' },
      ),
    create: (data) =>
      apiClient(`${services.appointment}/api/patient/appointments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  doctorAppointments: {
    /** Requires doctor identity header `X-Doctor-Id`. Optionally filter by status. */
    list: (doctorId, status) => {
      const q =
        status != null && String(status).trim().length > 0
          ? `?status=${encodeURIComponent(String(status).trim())}`
          : ''
      return apiClient(`${services.appointment}/api/doctor/appointments${q}`, {
        method: 'GET',
        headers: {
          'X-Doctor-Id': String(doctorId),
        },
      })
    },
    action: (doctorId, appointmentId, payload) =>
      apiClient(
        `${services.appointment}/api/doctor/appointments/${encodeURIComponent(String(appointmentId))}/action`,
        {
          method: 'POST',
          headers: {
            'X-Doctor-Id': String(doctorId),
          },
          body: JSON.stringify(payload),
        },
      ),
    accept: (doctorId, appointmentId, message = '') =>
      apiClient(
        `${services.appointment}/api/doctor/appointments/${encodeURIComponent(String(appointmentId))}/action`,
        {
          method: 'POST',
          headers: {
            'X-Doctor-Id': String(doctorId),
          },
          body: JSON.stringify({ action: 'ACCEPT', message }),
        },
      ),
    decline: (doctorId, appointmentId, message = '') =>
      apiClient(
        `${services.appointment}/api/doctor/appointments/${encodeURIComponent(String(appointmentId))}/action`,
        {
          method: 'POST',
          headers: {
            'X-Doctor-Id': String(doctorId),
          },
          body: JSON.stringify({ action: 'DECLINE', message }),
        },
      ),
    complete: (doctorId, appointmentId) =>
      apiClient(
        `${services.appointment}/api/doctor/appointments/${encodeURIComponent(String(appointmentId))}/complete`,
        {
          method: 'PATCH',
          headers: {
            'X-Doctor-Id': String(doctorId),
          },
        },
      ),
  },

  /** Appointment service: doctor directory for booking (optional `specialty` query). */
  patientBooking: {
    listDoctors: async (specialty) => {
      const base = `${services.appointment}/api/patient/booking/doctors`
      const q =
        typeof specialty === 'string' && specialty.trim().length > 0
          ? `?specialty=${encodeURIComponent(specialty.trim())}`
          : ''
      try {
        return await apiClient(`${base}${q}`, { method: 'GET' })
      } catch (error) {
        // Fallback for patient doctor search when appointment service is unavailable.
        const doctors = await apiClient(`${services.doctor}/api/doctors`, { method: 'GET' })
        const safe = Array.isArray(doctors) ? doctors : []
        if (typeof specialty === 'string' && specialty.trim().length > 0) {
          const wanted = specialty.trim().toLowerCase()
          return safe.filter((d) => {
            const spec = String(d?.specialty || d?.specialization || '').toLowerCase()
            return spec === wanted
          })
        }
        return safe
      }
    },
    getDoctorAvailability: (doctorId) =>
      apiClient(`${services.doctor}/api/availability/user/${encodeURIComponent(String(doctorId))}`, {
        method: 'GET',
      }),
  },


};

export default API;
