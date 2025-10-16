import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login({ onSwitch }: { onSwitch: () => void }) {
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      // We treat the field as email. If you need pure-username login, add your own edge service.
      const email = emailOrUsername.trim();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      // AuthGate will react to the session change and proceed.
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleLogin} style={{ display: 'grid', gap: 10 }}>
      <h2 style={{ margin: 0 }}>Welcome back</h2>

      <label style={labelStyle}>
        <span>Email</span>
        <input
          autoComplete="email"
          type="email"
          required
          placeholder="you@example.com"
          value={emailOrUsername}
          onChange={(e) => setEmailOrUsername(e.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        <span>Password</span>
        <div style={{ position: 'relative' }}>
          <input
            autoComplete="current-password"
            type={showPw ? 'text' : 'password'}
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...inputStyle, width: '100%' }}
          />
          <button
            type="button"
            onClick={() => setShowPw((s) => !s)}
            style={eyeBtnStyle}
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? 'Hide' : 'Show'}
          </button>
        </div>
      </label>

      {err && <div style={{ color: '#b00020', fontSize: 13 }}>{err}</div>}

      <button type="submit" disabled={loading} style={primaryBtnStyle}>
        {loading ? 'Logging in…' : 'Log in'}
      </button>

      <div style={{ fontSize: 14, opacity: 0.8, textAlign: 'center' }}>
        No account?{' '}
        <button type="button" onClick={onSwitch} style={linkBtnStyle}>
          Create one
        </button>
      </div>
    </form>
  );
}

/* styles */
const labelStyle: React.CSSProperties = {
  display: 'grid',
  gap: 6,
  fontSize: 14
};
const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 10,
  border: '1px solid #0002',
  outline: 'none',
  background: 'transparent',
  color: 'inherit'
};
const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 10,
  border: '1px solid #0000',
  background: 'var(--accent)',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 600
};
const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--accent)',
  padding: 0,
  cursor: 'pointer'
};
const eyeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  right: 8,
  top: 6,
  background: 'transparent',
  border: 'none',
  color: 'var(--muted)',
  cursor: 'pointer'
};
