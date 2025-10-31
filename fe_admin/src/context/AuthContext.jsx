/* eslint-disable react-refresh/only-export-components */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import PropTypes from 'prop-types';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if admin user is logged in when app starts
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('adminUser');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        console.log('Restored admin user from localStorage:', parsedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Invalid admin user data in localStorage:', error);
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }
    }

    setIsLoading(false);
  }, []);

  const login = (userData, token) => {
    console.log('Admin AuthContext.login called with:', userData);
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(userData));
    setUser(userData);
    console.log('Admin user state updated to:', userData);
  };

  const logout = () => {
    console.log('Admin logout called - clearing all auth data');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setUser(null);
    // Clear any other stored auth data
    sessionStorage.clear();

    // Force reload to ensure clean state
    setTimeout(() => {
      window.location.href = '/login';
    }, 100);
  };

  const isAuthenticated = useCallback(() => {
    const hasUser = !!user;
    const hasToken = !!localStorage.getItem('adminToken');
    const result = hasUser && hasToken;

    console.log('Admin isAuthenticated check:', {
      hasUser,
      hasToken,
      result,
      user: user?.hoten || 'No user',
    });

    return result;
  }, [user]);

  const isAdmin = useCallback(() => {
    // Admin app only allows admin users
    if (!user) return false;

    const role = user?.tenvaitro || user?.role || null;
    const code = user?.mavaitro || user?.role_id || null;
    const result =
      role === 'admin' ||
      role === 'manager' ||
      role === 'staff' ||
      code === 1 ||
      code === 2 ||
      code === 3;

    console.log('Admin isAdmin check:', {
      user: user,
      role,
      code,
      result,
    });

    return result;
  }, [user]);

  const getToken = useCallback(() => {
    return localStorage.getItem('adminToken');
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      logout,
      isAuthenticated,
      isAdmin,
      getToken,
    }),
    [user, isLoading, isAuthenticated, isAdmin, getToken]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};