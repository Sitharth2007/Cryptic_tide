import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRealtime } from '../context/RealtimeContext';
import { api } from '../services/apiClient';
import { Anchor, CheckSquare, Square, Clock, Shield, AlertTriangle } from 'lucide-react';

const VOYAGE_STEPS = [
  { label: 'Registered', desc: 'Team registered for the event', done: true },
  { label: 'Email Verified', desc: 'Team lead authenticated', done: true },
  { label: 'Team Verified', desc: 'Registration confirmed', done: true },
  { label: 'Waiting Room', desc: 'Awaiting Captain\'s signal', current: true },
  { label: 'Round 1 Begins', desc: 'Admin starts the voyage' },
  { label: '25 Questions', desc: 'Technical challenges' },
  { label: '10 Seconds Each', desc: 'Server-authoritative timer' },
  { label: 'Score Calculation', desc: 'Server-side scoring' },
  { label: 'Submission', desc: 'Attempt locked' },
  { label: 'Results', desc: 'Rankings computed' },
  { label: 'Top 15 Teams', desc: 'Advance to Round 2' },
];

const RULES = [
  { num: 1, title: 'One Question At A Time', desc: 'Only one question is visible at a time.' },
  { num: 2, title: '10 Seconds Per Question', desc: 'Each question has exactly 10 seconds. The timer is server-controlled.' },
  { num: 3, title: 'Answer Before Time Expires', desc: 'Submit your answer within the allowed time window.' },
  { num: 4, title: 'Scoring', desc: 'Correct = +10 | Wrong = −5 | Skipped = −10 | Timeout = −10' },
  { num: 5, title: 'No Changing Answers', desc: 'Once submitted and advanced, answers cannot be changed.' },
  { num: 6, title: 'Complete All Questions', desc: 'Round 1 contains exactly 25 questions.' },
  { num: 7, title: 'One Attempt Only', desc: 'Refreshing or reopening the browser does not restart the quiz.' },
  { num: 8, title: 'Fair Play', desc: 'Do not attempt to manipulate timers, scores, or admin access.' },
  { num: 9, title: 'Technical Issues', desc: 'Contact organizers if issues occur. Do not repeatedly refresh.' },
];

export default function WaitingRoom() {
  const { user, teamInfo } = useAuth();
  const { roundStatus, setRoundStatus } = useRealtime();
  const navigate = useNavigate();

  const [acknowledged, setAcknowledged] = useState(false);
  const [ackChecked, setAckChecked] = useState(false);
  const [ackBusy, setAckBusy] = useState(false);
  const [ackDone, setAckDone] = useState(false);
  const [liveStatus, setLiveStatus] = useState('NOT_STARTED');
  const [starting, setStarting] = useState(false);

  // Fetch initial round status
  useEffect(() => {
    api.get('/api/participant/round-status')
      .then(data => {
        setLiveStatus(data.status);
        if (data.status === 'ACTIVE') navigate('/participant/quiz');
      })
      .catch(() => {});
  }, []);

  // Realtime round-start notification
  useEffect(() => {
    if (roundStatus === 'ACTIVE') {
      setLiveStatus('ACTIVE');
      setStarting(true);
      setTimeout(() => navigate('/participant/quiz'), 2500);
    }
  }, [roundStatus]);

  async function handleAcknowledge() {
    if (!ackChecked || ackDone) return;
    setAckBusy(true);
    try {
      await api.post('/api/participant/rules-acknowledge');
      setAckDone(true);
    } catch {}
    setAckBusy(false);
  }

  if (starting) {
    return (
      <div className="ocean-bg page-center" style={{ textAlign: 'center', zIndex: 1 }}>
        <div className="animate-fade-in-up">
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚓</div>
          <h1 className="display-title" style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)', marginBottom: '1rem' }}>
            ROUND 1 IS STARTING!
          </h1>
          <p style={{ color: 'var(--gold-warm)', fontSize: '1.1rem', fontStyle: 'italic' }}>
            Prepare your crew... The voyage begins now!
          </p>
          <div className="spinner" style={{ marginTop: '2rem', width: 48, height: 48 }} />
        </div>
      </div>
    );
  }

  return (
    <div className="ocean-bg" style={{ minHeight: '100vh', padding: '2rem 1.5rem' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <span className="badge badge-orange" style={{ marginBottom: '1rem', display: 'inline-block' }}>
            <Clock size={12} />
            {liveStatus === 'NOT_STARTED' ? 'Awaiting Signal' : liveStatus}
          </span>
          <h1 className="display-title" style={{ fontSize: 'clamp(1.75rem, 5vw, 3rem)', marginBottom: '0.75rem' }}>
            THE VOYAGE HAS NOT BEGUN
          </h1>
          <p style={{ color: 'rgba(255,248,231,0.6)', fontSize: '1rem', fontStyle: 'italic', maxWidth: 500, margin: '0 auto' }}>
            Welcome, Captain. Your crew is assembled. Your map is ready.<br />
            Await the Captain's signal.
          </p>

          {/* Status indicator */}
          <div className="glass-card" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1.5rem', marginTop: '1.5rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: liveStatus === 'NOT_STARTED' ? 'var(--gold-amber)' : 'var(--ocean-aqua)', animation: 'pulse-danger 1s ease-in-out infinite' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.08em' }}>
              {liveStatus === 'NOT_STARTED' ? 'The Captain has not started the voyage yet.' : 'Round starting...'}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'clamp(220px, 30%, 300px) 1fr', gap: '2rem', alignItems: 'start' }}>
          {/* Voyage Map */}
          <div className="parchment-card">
            <div className="section-title" style={{ fontSize: '0.8rem', marginBottom: '1.5rem' }}>Voyage Map</div>
            <div className="voyage-path">
              {VOYAGE_STEPS.map((step, i) => (
                <div key={i} className="voyage-step">
                  <div className={`voyage-node ${step.done ? 'done' : step.current ? 'current' : 'pending'}`}>
                    {step.done ? '✓' : i + 1}
                  </div>
                  <div className="voyage-step-content">
                    <div className="voyage-step-label">{step.label}</div>
                    <div className="voyage-step-desc">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rules & Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Rules */}
            <div className="parchment-card">
              <div className="section-title" style={{ fontSize: '0.85rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={14} /> Rules & Guidelines
              </div>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {RULES.map(rule => (
                  <div key={rule.num} style={{ display: 'flex', gap: '0.75rem', padding: '0.875rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--r-sm)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: '6px', background: 'rgba(244,197,66,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--gold-bright)' }}>
                      {rule.num}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--parchment)', marginBottom: '0.2rem' }}>{rule.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'rgba(255,248,231,0.5)' }}>{rule.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scoring Example */}
            <div className="parchment-card">
              <div className="section-title" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>Scoring Example</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
                {[
                  { q: '5 Correct', calc: '5 × 10', val: '+50', c: 'var(--ocean-aqua)' },
                  { q: '2 Wrong',   calc: '2 × −5',  val: '−10', c: '#f87171' },
                  { q: '1 Skipped', calc: '1 × −10', val: '−10', c: 'var(--gold-amber)' },
                ].map(row => (
                  <div key={row.q} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: 'rgba(255,248,231,0.6)' }}>{row.q}</span>
                    <span style={{ color: 'rgba(255,248,231,0.4)', fontSize: '0.75rem' }}>{row.calc}</span>
                    <span style={{ color: row.c, fontWeight: 700 }}>{row.val}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0 0', fontWeight: 800, color: 'var(--gold-bright)', fontSize: '1rem' }}>
                  <span>Final Score</span>
                  <span>30</span>
                </div>
              </div>
            </div>

            {/* Ranking Info */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div className="section-title" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Top 15 Qualification</div>
              <ol style={{ paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'rgba(255,248,231,0.6)', lineHeight: 2 }}>
                <li>All teams are ranked after Round 1.</li>
                <li>Higher score ranks higher.</li>
                <li>Equal scores: <strong style={{ color: 'var(--gold-bright)' }}>lower completion time wins</strong>.</li>
                <li>Top 15 qualify for the next round.</li>
                <li>Results announced officially by organizers.</li>
              </ol>
            </div>

            {/* Acknowledgement */}
            <div className="parchment-card" style={{ border: ackDone ? '1px solid rgba(34,197,94,0.3)' : undefined }}>
              {!ackDone ? (
                <>
                  <label className="checkbox-row" style={{ cursor: 'pointer', marginBottom: '1.25rem' }}>
                    <input type="checkbox" checked={ackChecked} onChange={e => setAckChecked(e.target.checked)} id="rules-ack-checkbox" />
                    <span style={{ fontSize: '0.9rem', color: 'rgba(255,248,231,0.8)', lineHeight: 1.5 }}>
                      I have read and understood the event rules and guidelines.
                    </span>
                  </label>
                  <button
                    id="ack-btn"
                    className="btn btn-teal btn-full"
                    disabled={!ackChecked || ackBusy}
                    onClick={handleAcknowledge}
                  >
                    {ackBusy ? 'Recording...' : 'Acknowledge & Wait'}
                    <Anchor size={14} />
                  </button>
                </>
              ) : (
                <div className="success-banner" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <CheckSquare size={18} />
                  <span>Rules Acknowledged ✓ — Now wait for the Captain's signal.</span>
                </div>
              )}
            </div>

            {/* Final waiting message */}
            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', fontStyle: 'italic', color: 'rgba(255,248,231,0.55)', lineHeight: 2, fontSize: '0.9rem' }}>
              Your crew is ready.<br />Your map is prepared.<br />The questions await.<br /><br />
              Stay alert. Think fast. Choose wisely.<br /><br />
              <span style={{ color: 'var(--gold-bright)', fontStyle: 'normal', fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
                ⚓ The voyage begins when the Captain starts Round 1.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
