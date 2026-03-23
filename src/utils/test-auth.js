// Test utility for setting valid authentication
import { setAuthData } from './auth.js';

export const setTestAuth = () => {
  const testResponse = {
    tokenType: "Bearer",
    token: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsImlhdCI6MTc3NDI0NzcwNCwiZXhwIjoxNzc0MzM0MTA0fQ.6kh0DVIeo6XSR3dVOfgMglk04986Dss62MWwR8J09uk",
    user: {
        "id": "69c0dd9f91ec843b50eb7d14",
        "username": "admin",
        "email": "adminuser@example.com",
        "roles": [
            "ADMIN"
        ],
        "enabled": true
    }
  };

  try {
    setAuthData(testResponse.token, testResponse.user);
    console.log('Test authentication set successfully');
    console.log('User:', testResponse.user);
    console.log('Token valid:', testResponse.token.split('.').length === 3);
  } catch (error) {
    console.error('Failed to set test auth:', error);
  }
};

// Make available globally for testing
if (typeof window !== 'undefined') {
  window.setTestAuth = setTestAuth;
  console.log('Test auth function available: setTestAuth()');
}
