import { useState, useEffect, useContext, createContext } from 'react';
import PropTypes from 'prop-types'; // Add this import
import api from '../utils/api'; // Add this import

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = async () => {
    try {
      const response = await api.get('/api/v1/user/me');
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Authentication error:', error);
      setIsAuthenticated(false);
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const login = async (credentials) => {
    try {
      // console.log('Attempting login with credentials:', credentials);
      const response = await api.post('/api/v1/auth/signin', credentials);
      // console.log('Login response:', response.data);
      await checkAuthStatus();
      return response.data;
    } catch (error) {
      // console.error('Login error:', error.response ? error.response.data : error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/v1/auth/logout', {});
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      // console.error('Logout error:', error);
      // Handle error (e.g., show error message to user)
    }
  };

  const signup = async (userData) => {
    try {
      const response = await api.post('/api/v1/auth/signup', userData);
      await checkAuthStatus();
      return response.data;
    } catch (error) {
      // console.error('Signup error:', error.response ? error.response.data : error.message);
      throw error;
    }
  };

  const value = {
    isAuthenticated,
    user,
    loading,
    checkAuthStatus,
    login,
    logout,
    signup
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;
