import React from 'react';
import { sidebarStyle, logoBox, sidebarScrollArea, activeSbItem, sbItem, logoutBtnSide } from '../common/DashboardStyles';

const PMSidebar = ({ activeTab, setActiveTab, setShowProjectForm, onLogout }) => {
  return (
    <div style={sidebarStyle}>
      <div style={logoBox}>
        <span style={{ fontSize: '11px', fontWeight: '500', color: '#93c5fd', letterSpacing: '2px', textTransform: 'uppercase' }}>AM/NS</span>
        <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#fff', letterSpacing: '1px' }}>FORGE</span>
      </div>
      
      <div style={sidebarScrollArea}>
        <div style={{ padding: '0 20px 8px 20px', fontSize: '11px', color: '#88a3d4', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1.2px' }}>
          Navigation
        </div>
        <div
          style={activeTab === 'assignments' ? activeSbItem : sbItem}
          onClick={() => { setActiveTab('assignments'); setShowProjectForm(false); }}
        >
          My Assignments
        </div>
        <div
          style={activeTab === 'execution' ? activeSbItem : sbItem}
          onClick={() => { setActiveTab('execution'); setShowProjectForm(false); }}
        >
          Project Execution
        </div>
        <div
          style={activeTab === 'working_programs' ? activeSbItem : sbItem}
          onClick={() => { setActiveTab('working_programs'); setShowProjectForm(false); }}
        >
          Working Programs
        </div>
        <div
          style={activeTab === 'performance' ? activeSbItem : sbItem}
          onClick={() => { setActiveTab('performance'); setShowProjectForm(false); }}
        >
          Team Performance
        </div>
        <div
          style={activeTab === 'resource_analytics' ? activeSbItem : sbItem}
          onClick={() => { setActiveTab('resource_analytics'); setShowProjectForm(false); }}
        >
          Resource Analytics
        </div>
      </div>

      <button onClick={onLogout} style={logoutBtnSide}>LOGOUT</button>
    </div>
  );
};

export default PMSidebar;
