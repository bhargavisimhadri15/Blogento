import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../utils/api';

const AuthContext = createContext(null);

const getStoredToken = () => {
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
};

const clearStoredAuth = () => {
  try {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  } catch {
    // Ignore storage access errors in restricted browser contexts.
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await authAPI.getMe();
      setUser(data.user);
    } catch {
      clearStoredAuth();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  const login = async (credentials) => {
    const { data } = await authAPI.login(credentials);
    try {
      localStorage.setItem('token', data.token);
    } catch {
      // If storage is blocked, user stays logged in for this session state only.
    }
    setUser(data.user);
    return data;
  };

  const register = async (userData) => {
    const { data } = await authAPI.register(userData);
    try {
      localStorage.setItem('token', data.token);
    } catch {
      // If storage is blocked, user stays logged in for this session state only.
    }
    setUser(data.user);
    return data;
  };

  const logout = () => {
    clearStoredAuth();
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
