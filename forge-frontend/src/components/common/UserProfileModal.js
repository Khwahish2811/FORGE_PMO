import React from 'react';

export default function UserProfileModal({ isOpen, onClose, profileData }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', width: '450px', borderRadius: '24px', padding: '30px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.3)', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '15px' }}>
          <h2 style={{ margin: 0, color: '#1B3A6B' }}>User Profile</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748B' }}>✕</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '25px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #1B3A6B, #3B82F6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold' }}>
            {profileData.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '20px', color: '#0F172A' }}>{profileData.username}</h3>
            <span style={{ background: '#EFF6FF', color: '#3B82F6', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '800' }}>{profileData.role}</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Email Address</label>
            <div style={{ fontSize: '14px', color: '#1e293b', marginTop: '4px' }}>{profileData.email}</div>
          </div>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Contact Number</label>
            <div style={{ fontSize: '14px', color: '#1e293b', marginTop: '4px' }}>{profileData.phone}</div>
          </div>
          <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase' }}>Bio / About</label>
            <div style={{ fontSize: '14px', color: '#1e293b', marginTop: '4px', lineHeight: '1.5' }}>{profileData.bio}</div>
          </div>
          <div style={{ marginTop: '10px', padding: '12px', background: '#FEF3C7', color: '#92400E', borderRadius: '8px', fontSize: '12px', border: '1px solid #FDE68A', textAlign: 'center' }}>
            Profile details are managed by HR/Admin and cannot be edited.
          </div>
        </div>
      </div>
    </div>
  );
}
