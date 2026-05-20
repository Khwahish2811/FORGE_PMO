import React from 'react';

const NotificationPanel = ({ notifications = [], showNotifications, setShowNotifications, markRead }) => {
  return (
    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markRead(); }}>
      {/* Icon placeholder styled as bell */}
      <span style={{ fontSize: '22px' }}>🔔</span>
      {notifications.length > 0 && (
        <span style={{
          position: 'absolute',
          top: '-5px',
          right: '-5px',
          background: '#ef4444',
          color: '#fff',
          fontSize: '10px',
          borderRadius: '50%',
          width: '18px',
          height: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          border: '2px solid #fff'
        }}>
          {notifications.length}
        </span>
      )}
      
      {/* NOTIFICATION DROPDOWN */}
      {showNotifications && (
        <div style={{
          position: 'absolute',
          top: '40px',
          right: '0',
          width: '300px',
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0',
          zIndex: 1000,
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '15px',
            borderBottom: '1px solid #f1f5f9',
            fontWeight: 'bold',
            color: '#1B3A6B',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>Notifications</span>
            <span onClick={(e) => { e.stopPropagation(); setShowNotifications(false); }} style={{ cursor: 'pointer' }}>✕</span>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {notifications.length > 0 ? notifications.map(n => (
              <div key={n.id} style={{
                padding: '12px 15px',
                borderBottom: '1px solid #f8fafc',
                fontSize: '12px',
                color: '#475569',
                textAlign: 'left'
              }}>
                <div>{n.message}</div>
                <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px' }}>{n.created_at}</div>
              </div>
            )) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                No new notifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
