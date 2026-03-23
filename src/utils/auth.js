// Authentication utilities
export const setAuthData = (token, user) => {
  // Validate token format before storing
  if (token && typeof token === 'string' && token.split('.').length === 3) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    console.log('Auth data stored successfully');
  } else {
    console.error('Invalid token format, not storing:', token);
    throw new Error('Invalid JWT token format');
  }
};

export const getAuthData = () => {
  const token = localStorage.getItem('auth_token');
  const userStr = localStorage.getItem('auth_user');
  
  try {
    const user = userStr ? JSON.parse(userStr) : null;
    return { token, user };
  } catch (error) {
    console.error('Error parsing user data:', error);
    return { token, user: null };
  }
};

export const clearAuthData = () => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  console.log('Auth data cleared');
};

export const isTokenValid = (token) => {
  if (!token || typeof token !== 'string') return false;
  
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  try {
    // Try to decode the payload (not verifying signature)
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    // Check if token is expired
    if (payload.exp && payload.exp < now) {
      console.log('Token has expired');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating token:', error);
    return false;
  }
};
