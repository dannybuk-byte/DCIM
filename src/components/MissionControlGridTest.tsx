import React from 'react';

// Simple test version of Mission Control Grid
export const MissionControlGridTest: React.FC = () => {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#0a0e17',
      color: '#e8eef6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <h1 style={{ fontSize: '48px', margin: 0 }}>
        🚀 Mission Control Grid
      </h1>
      <p style={{ fontSize: '24px', color: '#00d2d3' }}>
        Component is rendering successfully!
      </p>
      <div style={{ fontSize: '16px', color: '#5a6d8a' }}>
        If you see this, the component is working.
      </div>
    </div>
  );
};

