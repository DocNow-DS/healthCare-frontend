// Debug utility for authentication issues
import { clearAuthData, getAuthData, isTokenValid } from './auth.js';

export const debugAuth = () => {
  console.log('=== Authentication Debug ===');
  
  // Check current auth state
  const { token, user } = getAuthData();
  
  console.log('Token exists:', !!token);
  console.log('User exists:', !!user);
  
  if (token) {
    console.log('Token length:', token.length);
    console.log('Token parts:', token.split('.').length);
    console.log('Token valid:', isTokenValid(token));
    
    if (token.split('.').length === 3) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Token payload:', payload);
        console.log('Token expires at:', new Date(payload.exp * 1000));
        console.log('Current time:', new Date());
        console.log('Token expired:', payload.exp < Math.floor(Date.now() / 1000));
      } catch (error) {
        console.error('Error decoding token payload:', error);
      }
    }
  }
  
  if (user) {
    console.log('User data:', user);
  }
  
  console.log('=== End Debug ===');
};

export const resetAuth = () => {
  console.log('Resetting authentication...');
  clearAuthData();
  console.log('Authentication reset complete');
  // Reload page to ensure clean state
  window.location.reload();
};

// Make functions available globally for debugging
if (typeof window !== 'undefined') {
  window.debugAuth = debugAuth;
  window.resetAuth = resetAuth;
  console.log('Debug functions available: debugAuth() and resetAuth()');
}
