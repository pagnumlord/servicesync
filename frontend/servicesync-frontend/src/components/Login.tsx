import React, { useState } from 'react';
import { LogIn, AlertCircle } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

interface LoginProps {
  onLoginSuccess: (token: string, user: any) => void;
}

function Login({ onLoginSuccess }: LoginProps) {
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: employeeNumber,
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token in localStorage
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Call success callback
      onLoginSuccess(data.token, data.user);
    } catch (error: any) {
      setError(error.message || 'Login failed. Please try again.');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F3F4F6',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '2rem'
      }}>
        {/* Logo and Title */}
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            backgroundColor: '#3B82F6',
            marginBottom: '1rem'
          }}>
            <span style={{
              fontSize: '2rem',
              color: 'white'
            }}>🔧</span>
          </div>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1F2937',
            margin: '0 0 0.5rem 0'
          }}>ServiceSync</h1>
          <p style={{
            fontSize: '0.875rem',
            color: '#6B7280',
            margin: 0
          }}>ICU Mechanical Dispatch System</p>
        </div>

        {/* Login Card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          padding: '2rem'
        }}>
          <h2 style={{
            fontSize: '1.25rem',
            fontWeight: '600',
            color: '#1F2937',
            marginBottom: '1.5rem',
            textAlign: 'center'
          }}>Sign in to your account</h2>

          {/* Error Message */}
          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '0.5rem',
              marginBottom: '1rem'
            }}>
              <AlertCircle style={{ width: '1.25rem', height: '1.25rem', color: '#DC2626', flexShrink: 0 }} />
              <span style={{ fontSize: '0.875rem', color: '#DC2626' }}>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Employee Number
              </label>
              <input
                type="text"
                value={employeeNumber}
                onChange={(e) => setEmployeeNumber(e.target.value)}
                placeholder="Enter your employee number"
                disabled={isLoading}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  border: '1px solid #D1D5DB',
                  borderRadius: '0.5rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
                onBlur={(e) => e.target.style.borderColor = '#D1D5DB'}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'white',
                backgroundColor: isLoading ? '#9CA3AF' : '#3B82F6',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#2563EB';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.backgroundColor = '#3B82F6';
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '1rem',
                    height: '1rem',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite'
                  }} />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn style={{ width: '1.25rem', height: '1.25rem' }} />
                  Sign in
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Info */}
        <div style={{
          marginTop: '1.5rem',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '0.75rem',
            color: '#6B7280',
            margin: 0
          }}>
            Default Login: Employee #22, Password: 22
          </p>
          <p style={{
            fontSize: '0.75rem',
            color: '#9CA3AF',
            margin: '0.5rem 0 0 0'
          }}>
            ServiceSync v2.0 - Better than Vision
          </p>
        </div>
      </div>

      {/* Spinner Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default Login;
