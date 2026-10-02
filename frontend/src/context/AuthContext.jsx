/**
 * Auth Context — handles Supabase OTP login and server-derived role.
 * Role is ALWAYS fetched from /api/me (server-authoritative).
 * The frontend NEVER derives role from email or localStorage.
 */
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { api } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);       // server-derived user info
  const [role, setRole] = useState(null);       // 'ADMIN' | 'PARTICIPANT' | 'UNREGISTERED'
  const [teamInfo, setTeamInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const fetchServerRole = useCallback(async () => {
    try {
      const me = await api.get('/api/me');
      setRole(me.role);
      setUser(me);
      if (me.team_id) {
        setTeamInfo({ team_id: me.team_id, team_name: me.team_name });
      }
    } catch (err) {
      setRole(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s) {
        fetchServerRole().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) {
        fetchServerRole();
      } else {
        setRole(null);
        setUser(null);
        setTeamInfo(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchServerRole]);

  const sendOTP = async (email) => {
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) {
      // For unregistered emails Supabase returns error — show user-friendly message
      if (error.message.includes('not allowed') || error.message.includes('Signups not allowed')) {
        throw new Error('This email is not registered for the event. Please register first.');
      }
      throw new Error(error.message);
    }
  };

  const verifyOTP = async (email, token) => {
    setAuthError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw new Error(error.message || 'Invalid or expired OTP.');
    // Role will be fetched via onAuthStateChange
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setUser(null);
    setTeamInfo(null);
  };

  return (
    <AuthContext.Provider value={{
      session, user, role, teamInfo, loading, authError,
      sendOTP, verifyOTP, signOut, fetchServerRole,
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
