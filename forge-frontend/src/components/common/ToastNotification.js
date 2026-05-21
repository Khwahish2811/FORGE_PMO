import React from 'react';

const ToastNotification = ({ message, type }) => {
  if (!message) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '30px',
      right: '30px',
      background: type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#10b981',
      color: 'white',
      padding: '16px 24px',
      borderRadius: '10px',
      boxShadow: type === 'error' 
        ? '0 10px 25px -5px rgba(239,68,68,0.4)' 
        : type === 'warning' 
          ? '0 10px 25px -5px rgba(245,158,11,0.4)' 
          : '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
      zIndex: 9999,
      fontWeight: '600',
      fontSize: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      animation: 'slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      {message}
    </div>
  );
};

export default ToastNotification;
