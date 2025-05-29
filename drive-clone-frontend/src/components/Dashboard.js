import React, { useState } from 'react';
import MyFiles from './MyFiles';

function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('files');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onLogout();
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* Navigation Header */}
      <header style={{
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '1rem',
        marginBottom: '2rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <h1 style={{ margin: 0, color: '#333', fontSize: '1.5rem' }}>Drive Clone</h1>
            <nav style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setActiveTab('files')}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: activeTab === 'files' ? '#007bff' : 'transparent',
                  color: activeTab === 'files' ? 'white' : '#333',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                My Files
              </button>
              <button
                onClick={() => setActiveTab('shared')}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  background: activeTab === 'shared' ? '#007bff' : 'transparent',
                  color: activeTab === 'shared' ? 'white' : '#333',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '1rem'
                }}
              >
                Shared with Me
              </button>
            </nav>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ color: '#666' }}>
              {JSON.parse(localStorage.getItem('user'))?.email || 'User'}
            </span>
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                border: 'none',
                background: '#dc3545',
                color: 'white',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
        {activeTab === 'files' && <MyFiles />}
        {activeTab === 'shared' && (
          <div style={{
            padding: '2rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h2>Shared Files</h2>
            <p>Files shared with you will appear here.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard; 