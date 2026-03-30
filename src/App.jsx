import { Route, Routes, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { getAuthData } from './utils/auth'
import Layout from './components/Layout'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import LandingPage from './pages/LandingPage.jsx'
import DoctorSearch from './pages/DoctorSearch.jsx'
import AISymptomChecker from './pages/AISymptomChecker.jsx'
import VideoConsultation from './pages/VideoConsultation.jsx'
import Payments from './pages/Payments.jsx'
import AdminDoctors from './pages/AdminDoctors.jsx'
import AdminPatients from './pages/AdminPatients.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import DoctorDashboard from './pages/DoctorDashboard.jsx'
import DoctorAppointments from './pages/DoctorAppointments.jsx'
import DoctorPatients from './pages/DoctorPatients.jsx'
import DoctorCarePlans from './pages/DoctorCarePlans.jsx'
import PatientAppointments from './pages/PatientAppointments.jsx'
import PatientReports from './pages/PatientReports.jsx'
import PatientNotifications from './pages/PatientNotifications.jsx'
import PatientProfile from './pages/PatientProfile.jsx'
import DoctorProfile from './pages/DoctorProfile.jsx'
import PaymentHistory from './pages/PaymentHistory.jsx'
import PaymentCheckout from './pages/PaymentCheckout.jsx'
import PaymentSuccess from './pages/PaymentSuccess.jsx'
import PaymentCancel from './pages/PaymentCancel.jsx'
import './utils/debug-auth.js' // Load debug utilities
import './utils/test-auth.js' // Load test auth utilities
import './utils/test-admin-routing.js' // Load admin routing test

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('auth_token'));

  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!localStorage.getItem('auth_token'));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const checkAuth = () => setIsAuthenticated(!!localStorage.getItem('auth_token'));

  // Get user role for conditional routing
  const getUserRole = () => {
    const { user } = getAuthData();
    return user?.roles?.[0] || 'PATIENT';
  };

  const userRole = getUserRole();

  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route 
        path="/login" 
        element={!isAuthenticated ? <Login onLogin={checkAuth} /> : <Navigate to={userRole === 'ADMIN' ? '/dashboard' : '/dashboard'} />} 
      />
      <Route 
        path="/signup" 
        element={!isAuthenticated ? <Signup onSignup={checkAuth} /> : <Navigate to={userRole === 'ADMIN' ? '/dashboard' : '/dashboard'} />} 
      />

      {/* Protected App Pages */}
      <Route 
        path="/dashboard/*" 
        element={
          isAuthenticated ? (
            <Layout onLogout={checkAuth}>
              <Routes>
                {userRole === 'ADMIN' ? (
                  <>
                    <Route index element={<AdminDashboard />} />
                    <Route path="doctors-management" element={<AdminDoctors />} />
                    <Route path="patients-management" element={<AdminPatients />} />
                    <Route path="management" element={<div className="p-10 bg-white rounded-3xl border-2 border-slate-50"><h1 className="text-3xl font-black text-[#182C61]">Admin Management</h1><p className="text-[#808e9b] mt-4 font-bold">User and Platform operations.</p></div>} />
                    <Route path="transactions" element={<Payments />} />
                    <Route path="settings" element={<div className="p-10 bg-white rounded-3xl border-2 border-slate-50"><h1 className="text-3xl font-black text-[#182C61]">Settings</h1><p className="text-[#808e9b] mt-4 font-bold">Admin settings and configuration.</p></div>} />
                    <Route path="payments" element={<PaymentHistory />} />
                    <Route path="payment/checkout" element={<PaymentCheckout />} />
                    <Route path="payment/success" element={<PaymentSuccess />} />
                    <Route path="payment/cancel" element={<PaymentCancel />} />
                  </>
                ) : userRole === 'DOCTOR' ? (
                  <>
                    <Route index element={<DoctorDashboard />} />
                    <Route path="appointments" element={<DoctorAppointments />} />
                    <Route path="patients" element={<DoctorPatients />} />
                    <Route path="care-plans" element={<DoctorCarePlans />} />
                    <Route path="consultations" element={<VideoConsultation />} />
                    <Route path="profile" element={<DoctorProfile />} />
                  </>
                ) : (
                  <>
                    <Route index element={<Home />} />
                    <Route path="doctors" element={<DoctorSearch />} />
                    <Route path="consultations" element={<VideoConsultation />} />
                    <Route path="ai-checker" element={<AISymptomChecker />} />
                    <Route path="payments" element={<Payments />} />
                    <Route path="appointments" element={<PatientAppointments />} />
                    <Route path="reports" element={<PatientReports />} />
                    <Route path="notifications" element={<PatientNotifications />} />
                    <Route path="profile" element={<PatientProfile />} />
                    <Route path="payment-history" element={<PaymentHistory />} />
                    <Route path="payment/checkout" element={<PaymentCheckout />} />
                    <Route path="payment/success" element={<PaymentSuccess />} />
                    <Route path="payment/cancel" element={<PaymentCancel />} />
                  </>
                )}
                <Route path="*" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        } 
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}

export default App
