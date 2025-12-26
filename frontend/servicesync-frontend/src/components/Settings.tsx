import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  Bell,
  Moon,
  Globe,
  Save,
  User,
  Link2
} from 'lucide-react';

const Settings: React.FC = () => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');

  // Integration states
  const [quickbooksConnected, setQuickbooksConnected] = useState(false);
  const [teamsConnected, setTeamsConnected] = useState(false);

  const handleSave = () => {
    // TODO: Save settings to backend
    alert('Settings saved successfully!');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <SettingsIcon style={{ width: '2rem', height: '2rem', color: '#6366f1' }} />
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1f2937',
            margin: 0
          }}>
            Settings
          </h1>
        </div>
        <p style={{
          fontSize: '1rem',
          color: '#6b7280',
          margin: 0
        }}>
          Manage your ServiceSync preferences
        </p>
      </div>

      {/* Settings Sections */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem'
      }}>
        {/* Profile Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <User style={{ width: '1.25rem', height: '1.25rem', color: '#6366f1' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Profile Settings
            </h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem' }}>
            Update your personal information and preferences
          </p>
          <button
            style={{
              padding: '0.75rem 1.25rem',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}
          >
            Edit Profile
          </button>
        </div>

        {/* Notifications Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Bell style={{ width: '1.25rem', height: '1.25rem', color: '#6366f1' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Notifications
            </h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937', margin: 0 }}>
                Enable notifications
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                Receive alerts for work order updates
              </p>
            </div>
            <button
              onClick={() => setNotifications(!notifications)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: notifications ? '#6366f1' : '#f3f4f6',
                color: notifications ? 'white' : '#374151',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}
            >
              {notifications ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        </div>

        {/* Appearance Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Moon style={{ width: '1.25rem', height: '1.25rem', color: '#6366f1' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Appearance
            </h2>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: '0.875rem', fontWeight: '500', color: '#1f2937', margin: 0 }}>
                Dark mode
              </p>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                Switch to dark theme (coming soon)
              </p>
            </div>
            <button
              disabled
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#f3f4f6',
                color: '#9ca3af',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'not-allowed',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}
            >
              Coming Soon
            </button>
          </div>
        </div>

        {/* Language Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Globe style={{ width: '1.25rem', height: '1.25rem', color: '#6366f1' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Language & Region
            </h2>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
              Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                width: '100%',
                maxWidth: '300px',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
            </select>
          </div>
        </div>

        {/* Integrations Section */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Link2 style={{ width: '1.25rem', height: '1.25rem', color: '#8B5CF6' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
              Integrations
            </h2>
          </div>
          <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
            Connect ServiceSync with your favorite tools and services
          </p>

          {/* QuickBooks Integration */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* QuickBooks Logo Placeholder */}
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #2CA01C 0%, #57B846 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700',
                fontSize: '1.25rem'
              }}>
                QB
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  QuickBooks
                </p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                  Sync invoices and accounting data
                </p>
              </div>
            </div>
            <button
              onClick={() => setQuickbooksConnected(!quickbooksConnected)}
              style={{
                position: 'relative',
                width: '52px',
                height: '28px',
                backgroundColor: quickbooksConnected ? '#8B5CF6' : '#d1d5db',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: quickbooksConnected ? '26px' : '2px',
                width: '24px',
                height: '24px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'left 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </button>
          </div>

          {/* Microsoft Teams Integration */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '1px solid #e5e7eb',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              {/* Teams Logo Placeholder */}
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '0.5rem',
                background: 'linear-gradient(135deg, #464EB8 0%, #5B67D1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: '700',
                fontSize: '1.25rem'
              }}>
                T
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                  Microsoft Teams
                </p>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: 0 }}>
                  Send notifications and updates
                </p>
              </div>
            </div>
            <button
              onClick={() => setTeamsConnected(!teamsConnected)}
              style={{
                position: 'relative',
                width: '52px',
                height: '28px',
                backgroundColor: teamsConnected ? '#8B5CF6' : '#d1d5db',
                borderRadius: '9999px',
                border: 'none',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '2px',
                left: teamsConnected ? '26px' : '2px',
                width: '24px',
                height: '24px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'left 0.2s',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </button>
          </div>

          {/* Coming Soon Placeholder */}
          <div style={{
            padding: '1rem',
            borderRadius: '0.5rem',
            border: '2px dashed #e5e7eb',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: '0.875rem'
          }}>
            More integrations coming soon...
          </div>
        </div>

        {/* Save Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          paddingTop: '1rem'
        }}>
          <button
            onClick={handleSave}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              boxShadow: '0 4px 6px rgba(139, 92, 246, 0.3)'
            }}
          >
            <Save style={{ width: '1rem', height: '1rem' }} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
