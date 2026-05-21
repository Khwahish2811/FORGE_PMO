import React from 'react';
import NotificationPanel from '../common/NotificationPanel';
import { topHeaderStyle, userCircleStyle } from '../common/DashboardStyles';

const PMHeader = ({ username, notifications, showNotifications, setShowNotifications, markRead, setShowProfileModal }) => {
  return (
    <div style={topHeaderStyle}>
      <span style={{ fontWeight: 700, color: '#1B3A6B' }}>Project Manager Dashboard</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        
        <NotificationPanel
          notifications={notifications}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          markRead={markRead}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setShowProfileModal(true)}>
            <span style={{ fontSize: '12px' }}>Welcome, <b>{username}</b></span>
            <div style={{ ...userCircleStyle, background: 'linear-gradient(135deg, #1B3A6B, #3B82F6)', color: '#fff', fontWeight: 'bold' }}>
                {username?.charAt(0).toUpperCase() || 'U'}
            </div>
        </div>
      </div>
    </div>
  );
};

export default PMHeader;
