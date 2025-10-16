import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Signup
 * - Creates auth user (email+password)
 * - Immediately signs them in (Supabase does this automatically unless email confirmation is required)
 * - Profile bootstrap (username & workspace) happens inside AuthGate after session is available
 */
export default function Signup({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) {
      setErr('You must agree to continue.');
      return;
    }
    setLoading(true);
    setErr(null);
    setNote(null);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;

      // If email confirmation is enabled, Supabase may not create a session until verified.
      // AuthGate will handle whichever case (session present or pending).
      console.log('Signup result', data);
      if (!data.session) {
        setNote('Check your email to confirm your account, then return to log in.');
      }
    } catch (e: any) {
      console.error(e);
      setErr(e?.message ?? 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSignup} style={{ display: 'grid', gap: 10 }}>
      <h2 style={{ margin: 0 }}>Create your account</h2>

      <label style={labelStyle}>
        <span>Email</span>
        <input
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        <span>Password</span>
        <div style={{ position: 'relative' }}>
          <input
            type={showPw ? 'text' : 'password'}
            required
            minLength={8}
            placeholder="At least 8 characters"
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

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>I agree to the terms.</span>
      </label>

      {err && <div style={{ color: '#b00020', fontSize: 13 }}>{err}</div>}
      {note && <div style={{ color: 'var(--muted)', fontSize: 13 }}>{note}</div>}

      <button type="submit" disabled={loading} style={primaryBtnStyle}>
        {loading ? 'Creating…' : 'Sign up'}
      </button>

      <div style={{ fontSize: 14, opacity: 0.8, textAlign: 'center' }}>
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} style={linkBtnStyle}>
          Log in
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
