/**
 * LoginPage — Custom team password login.
 * No Supabase email/OTP/magic-link. Just email + password → our FastAPI backend.
 */
import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Key, ChevronRight, Shield } from 'lucide-react';

export default function LoginPage() {
  const { session, role, teamLogin, loading } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState('');

  // Already authenticated — redirect immediately
  if (!loading && session && role) {
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />;
    if (role === 'PARTICIPANT') return <Navigate to="/participant" replace />;
    return <Navigate to="/unauthorized" replace />;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!password)     { setError('Please enter your password.'); return; }

    setBusy(true);
    try {
      await teamLogin(email.trim().toLowerCase(), password);
      // AuthContext will update role → triggers the Navigate above on re-render
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ocean-bg page-center">
      <div style={{ width: '100%', maxWidth: 420, zIndex: 1 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <h1 className="display-title" style={{ fontSize: '2rem' }}>CYBERHUB</h1>
          </Link>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
            letterSpacing: '0.2em', color: 'var(--gold-warm)',
            textTransform: 'uppercase', marginTop: '0.25rem',
          }}>
            The Technical Voyage
          </p>
        </div>

        <div className="parchment-card animate-fade-in-up">
          {/* Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '10px',
              background: 'rgba(244,197,66,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Key size={18} color="var(--gold-bright)" />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '0.95rem',
                color: 'var(--gold-bright)', textTransform: 'uppercase', letterSpacing: '0.05em',
              }}>
                Portal Sign In
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,248,231,0.4)' }}>
                Team & Administrator Credentials
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <label style={{
              display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(255,248,231,0.5)', marginBottom: '0.4rem',
            }}>
              Email Address
            </label>
            <input
              id="email-input"
              type="email"
              className="input"
              placeholder="team001@... or admin001@cryptictide.in"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={busy}
              autoFocus
              autoComplete="username"
            />

            <label style={{
              display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'rgba(255,248,231,0.5)', marginTop: '1rem', marginBottom: '0.4rem',
            }}>
              Password
            </label>
            <input
              id="password-input"
              type="password"
              className="input"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={busy}
              autoComplete="current-password"
            />

            {error && (
              <div className="error-banner" style={{ marginTop: '1rem' }}>
                {error}
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              className="btn btn-gold btn-full"
              style={{ marginTop: '1.25rem' }}
              disabled={busy}
            >
              {busy ? 'Authenticating...' : 'Enter The Voyage'}
              <ChevronRight size={16} />
            </button>
          </form>

          <div className="divider" />

          <div style={{ fontSize: '0.78rem', color: 'rgba(255,248,231,0.35)', textAlign: 'center', lineHeight: 1.7 }}>
            <Shield size={13} style={{ verticalAlign: 'middle', marginRight: '0.4rem', color: 'var(--ocean-aqua)' }} />
            Credentials are provided by the event organizers.
            <br />Only one device may be logged in per team at a time.
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/" style={{ color: 'rgba(255,248,231,0.4)', fontSize: '0.8rem', textDecoration: 'none' }}>
            ← Back to Landing
          </Link>
        </div>
      </div>
    </div>
  );
}
