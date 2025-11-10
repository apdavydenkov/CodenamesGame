import React, { useState, useEffect, useRef } from "react";

const DebugLogger = () => {
  // Загружаем логи из localStorage при инициализации
  const [logs, setLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('debug-logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const logsEndRef = useRef(null);

  useEffect(() => {
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const addLog = (type, args) => {
      const timestamp = new Date().toLocaleTimeString();
      const message = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, (key, value) => {
              if (key === 'socket' || key === 'io') return '[Socket]';
              return value;
            }, 2);
          } catch (e) {
            return '[Object]';
          }
        }
        return String(arg);
      }).join(' ');

      // Фильтруем только важные логи для отладки чата
      const importantPrefixes = [
        '[Unread]',
        '[Chat]',
        '[ChatDialog]',
        '[GameStatus]',
        '[Auth]',
        '[Socket]',
        '===',
        '❌',
        '✅',
        '⚠️',
        '🗑️'
      ];

      const isImportant = importantPrefixes.some(prefix => message.includes(prefix));

      if (isImportant) {
        setLogs(prev => {
          const newLogs = [...prev, { type, timestamp, message }].slice(-200);
          // Сохраняем в localStorage
          try {
            localStorage.setItem('debug-logs', JSON.stringify(newLogs));
          } catch (e) {
            // Игнорируем ошибки записи
          }
          return newLogs;
        });
      }
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const copyLogs = () => {
    const text = logs.map(l => `[${l.timestamp}] ${l.type.toUpperCase()}: ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  const clearLogs = () => {
    setLogs([]);
    localStorage.removeItem('debug-logs');
  };

  if (isClosed) return null;

  if (isMinimized) {
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: '#333',
        color: '#fff',
        padding: '8px 12px',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '12px',
        zIndex: 99999
      }} onClick={() => setIsMinimized(false)}>
        📋 Debug ({logs.length})
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: '400px',
      maxHeight: '300px',
      background: '#1e1e1e',
      border: '1px solid #444',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 99999,
      fontFamily: 'monospace',
      fontSize: '11px'
    }}>
      <div style={{
        background: '#2d2d2d',
        padding: '8px 12px',
        borderBottom: '1px solid #444',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: '8px 8px 0 0'
      }}>
        <span style={{ color: '#fff', fontWeight: 'bold' }}>Debug Logger</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={copyLogs} style={{
            background: '#007bff',
            color: '#fff',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}>Copy</button>
          <button onClick={clearLogs} style={{
            background: '#dc3545',
            color: '#fff',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}>Clear</button>
          <button onClick={() => setIsMinimized(true)} style={{
            background: '#6c757d',
            color: '#fff',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}>−</button>
          <button onClick={() => setIsClosed(true)} style={{
            background: '#dc3545',
            color: '#fff',
            border: 'none',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px'
          }}>×</button>
        </div>
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
        background: '#1e1e1e'
      }}>
        {logs.length === 0 ? (
          <div style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
            No logs yet...
          </div>
        ) : (
          logs.map((log, i) => (
            <div key={i} style={{
              marginBottom: '4px',
              padding: '4px',
              background: log.type === 'error' ? '#4a1818' : log.type === 'warn' ? '#4a3818' : '#252525',
              borderRadius: '4px',
              color: log.type === 'error' ? '#ff6b6b' : log.type === 'warn' ? '#ffa500' : '#a8dadc',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              <span style={{ color: '#888' }}>[{log.timestamp}]</span> {log.message}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
};

export default DebugLogger;
