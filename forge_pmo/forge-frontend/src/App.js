import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import SPOCDashboard from './components/SPOCDashboard';
import PGMDashboard from './components/PGMDashboard';
import PMDashboard from './components/PMDashboard';
import TMDashboard from './components/TMDashboard';

function App() {
  const [auth, setAuth] = useState({
    isLoggedIn: false,
    username: null,
    role: null 
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedRole = localStorage.getItem('role');

    if (savedUser && savedRole) {
      setAuth({
        isLoggedIn: true,
        username: savedUser,
        role: savedRole
      });
    }
  }, []);

  const handleLogin = (username, role) => {
    localStorage.setItem('user', username);
    localStorage.setItem('role', role);
    setAuth({
      isLoggedIn: true,
      username: username,
      role: role
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('role');
    setAuth({ isLoggedIn: false, username: null, role: null });
  };

  if (!auth.isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  switch (auth.role) {
    case 'SPOC':
      return <SPOCDashboard username={auth.username} onLogout={handleLogout} />;
    case 'PGM':
      return <PGMDashboard username={auth.username} onLogout={handleLogout} />;
    case 'PM':
      return <PMDashboard username={auth.username} onLogout={handleLogout} />;
    case 'TM':
      // Yahan humne 'user' prop pass kiya hai taaki TMDashboard ko data mil sake
      return <TMDashboard user={auth.username} onLogout={handleLogout} />;
    default:
      return <div style={{ padding: '20px' }}>Role not found. Please contact Admin.</div>;
  }
}

export default App;