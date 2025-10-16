import React, { useEffect, useMemo, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import App from '../App';
import Login from './Login';
import Signup from './Signup';

/**
 * AuthGate
 * - Watches Supabase session
 * - If logged out: shows Login / Signup tabs
 * - If logged in: loads app_users & workspace; if missing, asks for username+workspace to bootstrap
 * - If ready: renders <App workspaceId={...} />
 */

type ProfileRow = {
  id: string;
  username: string | null;
  workspace_id: string | null;
  last_accessed: string | null;
};

export default function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'login' | 'signup'>('login');

  // Load session on mount and subscribe to changes
  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        setProfile(null);
      }
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // When session exists, load profile (app_users)
  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);

      // Touch last_accessed in background (ignore policy errors in case you restricted updates)
      supabase
        .from('app_users')
        .update({ last_accessed: new Date().toISOString() })
        .eq('id', session.user.id);
      
      try {
        await supabase
          .from('app_users')
          .update({ last_accessed: new Date().toISOString() })
          .eq('id', session.user.id);
      } catch {
        // ignore errors (e.g., policy restriction)
      }

      const { data, error } = await supabase
        .from('app_users')
        .select('id, username, workspace_id, last_accessed')
        .eq('id', session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('load profile error', error);
        setProfile(null);
      } else {
        setProfile(data ?? null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [session]);

  // Not logged in: show auth forms
  if (!session) {
    return (
      <div style={shellStyle}>
        <div style={cardStyle}>
          <AuthTabs tab={tab} onTab={setTab} />
          {tab === 'login' ? <Login onSwitch={() => setTab('signup')} /> : <Signup onSwitch={() => setTab('login')} />}
        </div>
      </div>
    );
  }

  // Logged in but profile missing or incomplete: ask for quick bootstrap
  const needsBootstrap = !profile || !profile.username || !profile.workspace_id;

  if (loading) {
    return <CenteredSpinner label="Loading your workspace…" />;
  }

  if (needsBootstrap) {
    return (
      <div style={shellStyle}>
        <div style={cardStyle}>
          <h2 style={{ margin: 0 }}>Complete your profile</h2>
          <p style={{ opacity: 0.8, marginTop: 8 }}>
            Set a username and create/select a workspace to continue.
          </p>
          <CompleteProfile
            sessionUserId={session.user.id}
            onDone={(p) => setProfile(p)}
          />
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ marginTop: 12, background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // All good → render the actual app
  return <App workspaceId={profile.workspace_id!} />;
}

/* ---------- Small UI helpers ---------- */

function CenteredSpinner({ label }: { label?: string }) {
  return (
    <div style={shellStyle}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div className="spinner" style={spinnerStyle} />
          <div>{label ?? 'Loading…'}</div>
        </div>
      </div>
    </div>
  );
}

function AuthTabs({ tab, onTab }: { tab: 'login' | 'signup'; onTab: (t: 'login' | 'signup') => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <button
        onClick={() => onTab('login')}
        style={tab === 'login' ? tabActiveStyle : tabStyle}
      >
        Log in
      </button>
      <button
        onClick={() => onTab('signup')}
        style={tab === 'signup' ? tabActiveStyle : tabStyle}
      >
        Sign up
      </button>
    </div>
  );
}

/* ---------- Complete Profile (username + workspace) ---------- */

function CompleteProfile({
  sessionUserId,
  onDone
}: {
  sessionUserId: string;
  onDone: (p: ProfileRow) => void;
}) {
  const [username, setUsername] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Try to use the bootstrap_profile RPC if you created it; fall back to explicit inserts
  async function handleComplete() {
    setSaving(true);
    setError(null);
    try {
      // First try RPC (if you created the function from our previous message)
      const { data: rpcData, error: rpcError } = await supabase.rpc('bootstrap_profile', {
        p_username: username.trim(),
        p_workspace_name: workspaceName.trim() || 'Default Workspace'
      });

      if (!rpcError && rpcData && rpcData[0]?.workspace_id) {
        onDone({
          id: sessionUserId,
          username: username.trim(),
          workspace_id: rpcData[0].workspace_id,
          last_accessed: new Date().toISOString()
        });
        setSaving(false);
        return;
      }

      // Fallback path (no RPC exists)
      // 1) Create workspace (prefer owner_id; retry without if column is missing)
      let wsId: string;
      {
        const { data: wsTry, error: wsErrTry } = await supabase
          .from('workspaces')
          .insert({
            name: workspaceName.trim() || 'Default Workspace',
            owner_id: sessionUserId
          })
          .select('id')
          .single();
        if (!wsErrTry && wsTry) {
          wsId = wsTry.id as string;
        } else {
          // If the column doesn't exist in schema cache or table, retry without owner_id
          const { data: wsRetry, error: wsErrRetry } = await supabase
            .from('workspaces')
            .insert({ name: workspaceName.trim() || 'Default Workspace' })
            .select('id')
            .single();
          if (wsErrRetry) throw wsErrRetry;
          wsId = wsRetry!.id as string;
        }
      }

      // 2) Upsert app_users
      const { data: prof, error: profErr } = await supabase
        .from('app_users')
        .upsert({
          id: sessionUserId,
          username: username.trim(),
          workspace_id: wsId,
          last_accessed: new Date().toISOString()
        })
        .select('id, username, workspace_id, last_accessed')
        .single();
      if (profErr) throw profErr;

      onDone(prof as ProfileRow);
    } catch (e: any) {
      console.error(e);
      setError(e?.message ?? 'Failed to complete profile');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void handleComplete();
      }}
      style={{ display: 'grid', gap: 10, marginTop: 12 }}
    >
      <label style={labelStyle}>
        <span>Username</span>
        <input
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="dr_ayse"
          style={inputStyle}
        />
      </label>

      <label style={labelStyle}>
        <span>Workspace name</span>
        <input
          value={workspaceName}
          onChange={(e) => setWorkspaceName(e.target.value)}
          placeholder="Cardiology Notes"
          style={inputStyle}
        />
      </label>

      {error && <div style={{ color: '#b00020', fontSize: 13 }}>{error}</div>}

      <button type="submit" disabled={saving} style={primaryBtnStyle}>
        {saving ? 'Saving…' : 'Continue'}
      </button>
    </form>
  );
}

/* ---------- styles ---------- */

const shellStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'grid',
  placeItems: 'center',
  padding: 24,
  background: 'var(--bg)',
  color: 'var(--fg)'
};

const cardStyle: React.CSSProperties = {
  width: 'min(560px, 100%)',
  background: 'var(--card)',
  border: '1px solid #0002',
  borderRadius: 16,
  padding: 20,
  boxShadow: '0 10px 30px rgba(0,0,0,0.08)'
};

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

const tabStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 12px',
  borderRadius: 999,
  border: '1px solid #0002',
  background: 'transparent',
  cursor: 'pointer'
};

const tabActiveStyle: React.CSSProperties = {
  ...tabStyle,
  background: 'color-mix(in oklab, var(--accent), var(--card) 15%)',
  borderColor: 'var(--accent)'
};

const spinnerStyle: React.CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: '50%',
  border: '2px solid #0002',
  borderTopColor: 'var(--accent)',
  animation: 'spin 1s linear infinite'
};
