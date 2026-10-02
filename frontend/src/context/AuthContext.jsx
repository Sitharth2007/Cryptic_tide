/**
 * Auth Context — Custom JWT team authentication.
 * Replaces Supabase OTP/email flow with password-based team login.
 * JWT token is stored in localStorage. Role is server-derived from /api/me.
 * Frontend NEVER derives role from the JWT payload directly.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from '../services/apiClient';

const AuthContext = createContext(null);

const TOKEN_KEY = 'cryptictide_token';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);         // server-derived user info
  const [role, setRole] = useState(null);          // 'ADMIN' | 'PARTICIPANT'
  const [teamInfo, setTeamInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchServerRole = useCallback(async (accessToken) => {
    try {
      const me = await api.get('/api/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      setRole(me.role);
      setUser(me);
      if (me.team_id) {
        setTeamInfo({
          team_id: me.team_id,
          team_name: me.team_name,
          team_number: me.team_number,
        });
      }
      return me;
    } catch (err) {
      // If the server rejects the token (expired / invalidated by another login),
      // clear everything so the user is redirected to login.
      clearAuth();
      return null;
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      fetchServerRole(storedToken).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchServerRole]);

  // ─── Token helpers ──────────────────────────────────────────────────────────
  function saveToken(newToken) {
    localStorage.setItem(TOKEN_KEY, newToken);
    setToken(newToken);
  }

  function clearAuth() {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setRole(null);
    setUser(null);
    setTeamInfo(null);
  }

  // ─── Team Login ─────────────────────────────────────────────────────────────
  const teamLogin = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    // data = { access_token, token_type, team: {...} }
    saveToken(data.access_token);
    await fetchServerRole(data.access_token);
    return data;
  };

  // ─── Admin Login ────────────────────────────────────────────────────────────
  const adminLogin = async (email, password) => {
    const data = await api.post('/api/auth/admin/login', { email, password });
    saveToken(data.access_token);
    // For admin, role is derived from /api/me or admin payload
    setRole('ADMIN');
    setUser({ email, role: 'ADMIN', ...data.admin });
    return data;
  };

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const signOut = async () => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    try {
      if (currentToken) {
        await api.post('/api/auth/logout', {}, {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      }
    } catch (_) {
      // Ignore logout errors — clear local state regardless
    } finally {
      clearAuth();
    }
  };

  // Expose the raw token so apiClient can use it
  const getToken = () => localStorage.getItem(TOKEN_KEY);

  return (
    <AuthContext.Provider value={{
      token, user, role, teamInfo, loading,
      teamLogin, adminLogin, signOut, fetchServerRole, getToken,
      // Legacy shims — keep these so any old code calling them doesn't crash
      session: token ? { access_token: token } : null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
