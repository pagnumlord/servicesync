import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

interface User {
  id: number;
  employeeNumber?: string;
  username: string;
  role: string;
  firstName: string;
  lastName: string;
  email?: string;
  permissions?: Permission[];
}

interface Permission {
  name: string;
  description: string;
  category: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasPermission: (permissionName: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Fetch fresh user data with permissions
          await fetchUserData(storedToken);
        } catch (error) {
          console.error('Failed to initialize auth:', error);
          logout();
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const fetchUserData = async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Handle token expiration or invalid token
      if (response.status === 401 || response.status === 403) {
        console.warn('Token expired or invalid, logging out...');
        logout();
        throw new Error('Session expired');
      }

      if (!response.ok) {
        // Check if response body contains token expiration error
        const errorText = await response.text();
        if (errorText.includes('TokenExpiredError') || errorText.includes('jwt expired')) {
          console.warn('Token expired, logging out...');
          logout();
          throw new Error('Session expired');
        }
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error fetching user data:', error);
      throw error;
    }
  };

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
    }
  };

  const hasPermission = (permissionName: string): boolean => {
    if (!user) return false;

    // Admins have all permissions
    if (user.role === 'admin') return true;

    // Check if user has specific permission
    return user.permissions?.some(p => p.name === permissionName) || false;
  };

  const refreshUser = async () => {
    if (token) {
      await fetchUserData(token);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
    hasPermission,
    refreshUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
