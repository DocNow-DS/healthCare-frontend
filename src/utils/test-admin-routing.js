// Test utility to verify admin routing
import { getAuthData } from './auth.js';

export const testAdminRouting = () => {
  const { user, token } = getAuthData();
  
  console.log('=== Admin Routing Test ===');
  console.log('Token exists:', !!token);
  console.log('User data:', user);
  console.log('User role:', user?.roles?.[0]);
  console.log('Is Admin:', user?.roles?.[0] === 'ADMIN');
  
  if (user?.roles?.[0] === 'ADMIN') {
    console.log('✅ Admin user detected - should route to admin dashboard');
    console.log('Expected routes: /dashboard (AdminDoctors), /dashboard/doctors-management, /dashboard/patients-management');
  } else if (user?.roles?.[0] === 'DOCTOR') {
    console.log('👨‍⚕️ Doctor user detected - should route to doctor dashboard');
  } else {
    console.log('👤 Patient user detected - should route to patient dashboard');
  }
  
  console.log('=== End Test ===');
};

// Make available globally for testing
if (typeof window !== 'undefined') {
  window.testAdminRouting = testAdminRouting;
  console.log('Admin routing test available: testAdminRouting()');
}
