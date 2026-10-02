import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Key, Shield, ChevronRight } from 'lucide-react';

export default function LoginPage() {
  const { session, role, sendOTP, verifyOTP, loading } = useAuth();
  const [step, setStep] = useState('email'); // 'email' | 'otp'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Already logged in — redirect
  if (!loading && session && role) {
    if (role === 'ADMIN') return <Navigate to="/admin" replace />;
    if (role === 'PARTICIPANT') return <Navigate to="/participant" replace />;
    return <Navigate to="/unauthorized" replace />;
  }

  async function handleSendOTP(e) {
    e.preventDefault();
    setError(''); setInfo('');
    if (!email.trim()) { setError('Please enter your registered email.'); return; }
    setBusy(true);
    try {
      await sendOTP(email.trim().toLowerCase());
      setInfo(`OTP sent to ${email}. Check your inbox (and spam folder).`);
      setStep('otp');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOTP(e) {
    e.preventDefault();
    setError('');
    if (!otp.trim()) { setError('Please enter the OTP from your email.'); return; }
    setBusy(true);
    try {
      await verifyOTP(email, otp.trim());
      // Navigation handled by App.jsx via role
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ocean-bg page-center">
      <div style={{ width: '100%', maxWidth: 440, zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <h1 className="display-title" style={{ fontSize: '2rem' }}>CYBERHUB</h1>
          </Link>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.2em', color: 'var(--gold-warm)', textTransform: 'uppercase', marginTop: '0.25rem' }}>
            The Technical Voyage
          </p>
        </div>

        <div className="parchment-card animate-fade-in-up">
          {step === 'email' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(244,197,66,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Mail size={18} color="var(--gold-bright)" />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--gold-bright)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Enter The Voyage</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,248,231,0.4)' }}>Use your registered email</div>
                </div>
              </div>

              <form onSubmit={handleSendOTP}>
                <label style={{ display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,248,231,0.5)', marginBottom: '0.5rem' }}>
                  Registered Email
                </label>
                <input
                  id="email-input"
                  type="email"
                  className="input"
                  placeholder="captain@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={busy}
                  autoFocus
                />

                {error && <div className="error-banner" style={{ marginTop: '1rem' }}>{error}</div>}

                <button type="submit" className="btn btn-gold btn-full" style={{ marginTop: '1.25rem' }} disabled={busy}>
                  {busy ? 'Sending OTP...' : 'Send Magic Code'}
                  <ChevronRight size={16} />
                </button>
              </form>

              <div className="divider" />
              <div style={{ fontSize: '0.8rem', color: 'rgba(255,248,231,0.4)', textAlign: 'center', lineHeight: 1.7 }}>
                <Shield size={14} style={{ verticalAlign: 'middle', marginRight: '0.4rem', color: 'var(--ocean-aqua)' }} />
                No password required. We send a one-time code to your email.
                <br />Only registered team leads can log in.
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 40, height: 40, borderRadius: '10px', background: 'rgba(244,197,66,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={18} color="var(--gold-bright)" />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--gold-bright)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Check Your Email</div>
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,248,231,0.4)' }}>Sent to {email}</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', padding: '1rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--r-md)', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.9rem', color: '#4ade80', lineHeight: 1.6 }}>
                  A Magic Link has been sent to your inbox.<br />
                  <strong>You can close this tab and click the "Sign In" link inside the email to enter the voyage.</strong>
                </p>
              </div>

              <button className="btn btn-outline btn-full btn-sm" style={{ marginTop: '0.75rem' }} onClick={() => { setStep('email'); setOtp(''); setError(''); }}>
                ← Use different email
              </button>
            </>
          )}
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
