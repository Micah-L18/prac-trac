import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config/api';

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
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  
  // Keep track of ongoing requests to prevent race conditions
  const abortControllersRef = useRef(new Map());

  // Helper function to create and manage abort controllers
  const createAbortController = (key) => {
    // Cancel any existing request with the same key
    if (abortControllersRef.current.has(key)) {
      abortControllersRef.current.get(key).abort();
    }
    
    const controller = new AbortController();
    abortControllersRef.current.set(key, controller);
    
    // Add a timeout to prevent hanging requests
    setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort();
        console.log(`Request ${key} timed out after 10 seconds`);
      }
    }, 10000);
    
    return controller;
  };

  // Cleanup function to remove completed requests
  const cleanupAbortController = (key) => {
    abortControllersRef.current.delete(key);
  };

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const abortController = createAbortController('checkAuth');
      const savedToken = localStorage.getItem('token');
      
      if (savedToken) {
        try {
          const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            },
            signal: abortController.signal
          });
          
          if (!abortController.signal.aborted) {
            if (response.ok) {
              const userData = await response.json();
              setUser(userData.data);
              setToken(savedToken);
            } else {
              // Token is invalid, remove it
              console.log('Token validation failed:', response.status);
              localStorage.removeItem('token');
              setToken(null);
              setUser(null);
            }
          }
        } catch (error) {
          if (!abortController.signal.aborted && error.name !== 'AbortError') {
            console.error('Auth check failed:', error);
            // Only clear token if it's a 401/403, keep it for network errors
            if (error.message?.includes('401') || error.message?.includes('403')) {
              localStorage.removeItem('token');
              setToken(null);
              setUser(null);
            }
          }
        }
      } else {
        // No token found, user is not authenticated
        setUser(null);
        setToken(null);
      }
      
      // Always set loading to false after auth check, regardless of outcome
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
      
      cleanupAbortController('checkAuth');
    };

    checkAuth();
    
    // Cleanup function to abort request if component unmounts
    return () => {
      if (abortControllersRef.current.has('checkAuth')) {
        abortControllersRef.current.get('checkAuth').abort();
        cleanupAbortController('checkAuth');
      }
    };
  }, []);

  const login = async (email, password) => {
    const abortController = createAbortController('login');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        signal: abortController.signal
      });

      if (!abortController.signal.aborted) {
        if (response.ok) {
          const data = await response.json();
          setUser(data.data.user);
          setToken(data.data.token);
          localStorage.setItem('token', data.data.token);
          return { success: true, user: data.data.user };
        } else {
          const errorData = await response.json();
          return { success: false, error: errorData.message || 'Login failed' };
        }
      }
    } catch (error) {
      if (!abortController.signal.aborted && error.name !== 'AbortError') {
        console.error('Login error:', error);
        return { success: false, error: 'An error occurred during login' };
      }
    } finally {
      cleanupAbortController('login');
    }
  };  const register = async (firstName, lastName, email, password) => {
    const abortController = createAbortController('register');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          first_name: firstName, 
          last_name: lastName, 
          email, 
          password 
        }),
        signal: abortController.signal
      });

      if (!abortController.signal.aborted) {
        if (response.ok) {
          const data = await response.json();
          setUser(data.data.user);
          setToken(data.data.token);
          localStorage.setItem('token', data.data.token);
          return { success: true, user: data.data.user };
        } else {
          const errorData = await response.json();
          return { success: false, error: errorData.message || 'Registration failed' };
        }
      }
    } catch (error) {
      if (!abortController.signal.aborted && error.name !== 'AbortError') {
        console.error('Registration error:', error);
        return { success: false, error: 'An error occurred during registration' };
      }
    } finally {
      cleanupAbortController('register');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();

      if (response.ok) {
        // Update user state with new profile data
        setUser(prev => ({
          ...prev,
          ...data.data
        }));
        return true;
      } else {
        console.error('Profile update failed:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      return false;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};