import React, { useState, useEffect, useRef } from 'react';

// Styling
const focusOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 };
const focusCardPro = { background: '#fff', padding: '40px', borderRadius: '24px', width: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' };
const btnDuration = { padding: '15px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', fontSize: '14px', fontWeight: '700', color: '#0F172A', cursor: 'pointer', transition: 'all 0.2s' };
const btnFocusCancelSetup = { width: '100%', marginTop: '20px', padding: '12px', background: 'transparent', color: '#64748B', border: 'none', cursor: 'pointer', fontWeight: '600' };
const btnFocusPrimary = { flex: 1, padding: '15px', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 10px rgba(59,130,246,0.3)' };
const btnFocusSecondary = { flex: 1, padding: '15px', background: '#f1f5f9', color: '#64748B', border: 'none', borderRadius: '12px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' };

const FocusMode = ({ isFocusMode, focusTask, onClose, onLogTime, showToast }) => {
  const [timerLeft, setTimerLeft] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [focusPhase, setFocusPhase] = useState('setup'); // 'setup', 'active', 'break', 'completed'
  const [totalTime, setTotalTime] = useState(25 * 60);
  const timerRef = useRef(null);

  // SVG Circular Progress logic
  const radius = 100;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = totalTime > 0 ? circumference - (timerLeft / totalTime) * circumference : 0;

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Focus Timer Logic
  useEffect(() => {
    if (isTimerRunning && timerLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimerLeft(prev => prev - 1);
      }, 1000);
    } else if (timerLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      clearInterval(timerRef.current);
      if (focusPhase === 'active') {
        // Finished main focus session
        setFocusPhase('completed');
        new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {});
      } else if (focusPhase === 'break') {
        // Finished break
        if (showToast) showToast('Break time is over! Ready to focus again?', 'success');
        onClose();
      }
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, timerLeft, focusPhase, onClose, showToast]);

  if (!isFocusMode || !focusTask) return null;

  const startSession = (minutes) => {
    setTotalTime(minutes * 60);
    setTimerLeft(minutes * 60);
    setFocusPhase('active');
    setIsTimerRunning(true);
  };

  const toggleTimer = () => {
    setIsTimerRunning(!isTimerRunning);
  };

  const logPartialTimeAndClose = () => {
    const secondsSpent = totalTime - timerLeft;
    const hoursSpent = Math.max(0.1, Math.round((secondsSpent / 3600) * 10) / 10); // Round to 1 decimal, min 0.1
    const sessionMins = Math.round(secondsSpent / 60);
    const sessionType = totalTime === 15 * 60 ? 'Quick Fix' : totalTime === 25 * 60 ? 'Deep Work' : totalTime === 45 * 60 ? 'Hyper Focus' : 'Flow State';
    
    if (onLogTime) {
      onLogTime(focusTask, hoursSpent, sessionType, sessionMins);
    }
    if (showToast) {
      showToast(`Logged ${hoursSpent}h (${sessionMins} mins) for your session!`, 'success');
    }
    onClose();
    setIsTimerRunning(false);
  };

  const startBreak = () => {
    setFocusPhase('break');
    setTotalTime(5 * 60); // 5 min break
    setTimerLeft(5 * 60);
    setIsTimerRunning(true);
  };

  return (
    <div style={focusOverlay}>
      <div style={focusCardPro}>
        {focusPhase === 'setup' && (
          <>
            <h2 style={{ margin: '0 0 10px 0', color: '#1B3A6B' }}>Focus Session</h2>
            <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '25px' }}>
              Select your focus duration for:<br /><b>{focusTask.task_title}</b>
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <button onClick={() => startSession(15)} style={btnDuration}> Quick Fix <br /> <span style={{ fontSize: '12px', fontWeight: 'normal' }}>15 min</span></button>
              <button onClick={() => startSession(25)} style={{ ...btnDuration, background: '#EFF6FF', borderColor: '#3B82F6' }}> Deep Work <br /> <span style={{ fontSize: '12px', fontWeight: 'normal' }}>25 min</span></button>
              <button onClick={() => startSession(45)} style={btnDuration}> Hyper Focus <br /> <span style={{ fontSize: '12px', fontWeight: 'normal' }}>45 min</span></button>
              <button onClick={() => startSession(60)} style={btnDuration}> Flow State <br /> <span style={{ fontSize: '12px', fontWeight: 'normal' }}>60 min</span></button>
            </div>
            <button onClick={onClose} style={btnFocusCancelSetup}>Cancel</button>
          </>
        )}

        {(focusPhase === 'active' || focusPhase === 'break') && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <span style={{ background: focusPhase === 'break' ? '#ECFDF5' : '#EFF6FF', color: focusPhase === 'break' ? '#10B981' : '#3B82F6', padding: '5px 12px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold' }}>
                {focusPhase === 'break' ? ' Break Time' : ' Focusing'}
              </span>
              {focusPhase === 'active' && <span style={{ fontSize: '12px', color: '#64748B' }}>Priority: <b>{focusTask.priority}</b></span>}
            </div>

            {focusPhase === 'active' && <h3 style={{ fontSize: '16px', margin: '0 0 20px 0', color: '#0F172A' }}>{focusTask.task_title}</h3>}

            <div style={{ position: 'relative', width: '220px', height: '220px', margin: '0 auto' }}>
              <svg height="220" width="220" style={{ transform: 'rotate(-90deg)' }}>
                <circle stroke="#F1F5F9" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius + 10} cy={radius + 10} />
                <circle
                  stroke={focusPhase === 'break' ? '#10B981' : '#3B82F6'}
                  fill="transparent"
                  strokeWidth={stroke}
                  strokeDasharray={circumference + ' ' + circumference}
                  style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s linear' }}
                  strokeLinecap="round"
                  r={normalizedRadius} cx={radius + 10} cy={radius + 10}
                />
              </svg>
              <div style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: '48px', fontWeight: '800', color: '#0F172A', fontFamily: 'monospace', letterSpacing: '-2px' }}>{formatTime(timerLeft)}</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
              <button onClick={toggleTimer} style={btnFocusPrimary}>
                {isTimerRunning ? ' Pause' : ' Resume'}
              </button>
              {focusPhase === 'active' && (
                <button onClick={logPartialTimeAndClose} style={btnFocusSecondary}>Stop & Log Time</button>
              )}
              {focusPhase === 'break' && (
                <button onClick={onClose} style={btnFocusSecondary}>Skip Break</button>
              )}
            </div>
          </>
        )}

        {focusPhase === 'completed' && (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#10B981', margin: '0 0 10px 0' }}>Session Complete!</h2>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '30px' }}>
              Great job! You stayed focused for {Math.round(totalTime / 60)} minutes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={logPartialTimeAndClose} style={{ ...btnFocusPrimary, width: '100%' }}>Log Time & Close</button>
              <button onClick={() => { logPartialTimeAndClose(); startBreak(); }} style={{ ...btnFocusSecondary, width: '100%', background: '#ECFDF5', color: '#10B981', border: '1px solid #A7F3D0' }}>Take a 5 min Break</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FocusMode;
