import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const response = await fetch('http://127.0.0.1:8000/api/login/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (data.success) {
        onLogin(data.username, data.role, data.token);
      } else {
        setErrorMsg(' Invalid Username or Password! Please check your credentials.');
      }
    } catch (err) {
      setErrorMsg(' Cannot connect to server. Please ensure the Django server is running.');
    }
  };

  return (
    <div style={{ backgroundColor: '#f0ede8', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ background: '#fff', width: '420px', border: '1px solid #ccc', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>

        {/* Navy Title Bar */}
        <div style={{ background: '#1B3A6B', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px' }}>
          <div style={{ background: '#2563EB', color: '#fff', fontWeight: 'bold', fontSize: '13px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>F</div>
          <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '15px' }}>FORGE | Login</span>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '30px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: 'bold' }}>Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter ID..."
              style={{ width: '100%', padding: '10px', border: '1.5px solid #b0c4de' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#666', marginBottom: '8px', fontWeight: 'bold' }}>Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '10px', border: '1.5px solid #b0c4de' }}
            />
          </div>

          {errorMsg && (
            <div style={{
              background: '#fee2e2', color: '#991b1b',
              padding: '10px 14px', borderRadius: '6px',
              fontSize: '13px', fontWeight: '600',
              marginBottom: '15px', borderLeft: '4px solid #ef4444'
            }}>
              {errorMsg}
            </div>
          )}

          <button type="submit" style={{ width: '100%', padding: '12px', background: '#1B3A6B', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
            LOGIN
          </button>
        </form>

        <div style={{ background: '#f8f9fa', padding: '10px 20px', borderTop: '1px solid #eee', fontSize: '10px', color: '#888' }}>
          AMNS India – Internal Use Only
        </div>
      </div>
    </div>
  );
};

export default Login;