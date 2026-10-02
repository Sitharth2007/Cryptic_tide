import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/apiClient';
import {
  LayoutDashboard, Users, Trophy, Star, Download,
  Play, Square, LogOut, RefreshCw, AlertTriangle
} from 'lucide-react';

// ─── Overview Tab ──────────────────────────────────────────────────────────
function OverviewTab() {
  const [stats, setStats] = useState(null);
  const [round, setRound] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [s, r, t] = await Promise.all([
        api.get('/api/admin/dashboard'),
        api.get('/api/admin/round-status'),
        api.get('/api/admin/teams'),
      ]);
      setStats(s); setRound(r); setTeams(t);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const iv = setInterval(load, 10000); return () => clearInterval(iv); }, [load]);

  async function handleStart() {
    setStarting(true); setMsg(''); setError('');
    try {
      await api.post('/api/admin/rounds/start');
      setMsg('Round 1 started! Participants are being notified via Realtime.');
      setConfirm(false);
      load();
    } catch (e) { setError(e.message); }
    finally { setStarting(false); }
  }

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" /></div>;

  const statCards = [
    { label: 'Total Teams',         val: stats?.total_teams ?? 0,         color: 'var(--gold-bright)' },
    { label: 'Rules Acknowledged',  val: stats?.rules_acknowledged ?? 0,  color: 'var(--ocean-aqua)' },
    { label: 'Not Acknowledged',    val: stats?.rules_not_acknowledged ?? 0, color: 'var(--gold-amber)' },
    { label: 'In Progress',         val: stats?.in_progress ?? 0,         color: 'var(--gold-fire)' },
    { label: 'Completed',           val: stats?.completed ?? 0,           color: '#4ade80' },
    { label: 'Waiting',             val: stats?.waiting ?? 0,             color: '#94a3b8' },
  ];

  return (
    <div>
      <h2 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>Overview</h2>

      {/* Stat Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {statCards.map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-card-number" style={{ color: c.color }}>{c.val}</div>
            <div className="stat-card-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Round Control */}
      <div className="parchment-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="section-title" style={{ fontSize: '0.85rem' }}>ROUND 1 — THE FIRST VOYAGE</div>
            <div style={{ marginTop: '0.5rem' }}>
              <span className={`badge ${round?.status === 'NOT_STARTED' ? 'badge-gray' : round?.status === 'ACTIVE' ? 'badge-teal' : 'badge-green'}`}>
                {round?.status || 'LOADING'}
              </span>
              {round?.started_at && (
                <span style={{ marginLeft: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'rgba(255,248,231,0.4)' }}>
                  Started: {new Date(round.started_at).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {round?.status === 'NOT_STARTED' && (
              <button id="start-round-btn" className="btn btn-gold" onClick={() => setConfirm(true)} disabled={starting}>
                <Play size={14} /> Start Round 1
              </button>
            )}
            {round?.status === 'ACTIVE' && (
              <button className="btn btn-danger" onClick={async () => { await api.post('/api/admin/rounds/end'); load(); }}>
                <Square size={14} /> End Round
              </button>
            )}
            <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={14} /></button>
          </div>
        </div>

        {msg && <div className="success-banner" style={{ marginTop: '1rem' }}>{msg}</div>}
        {error && <div className="error-banner" style={{ marginTop: '1rem' }}>{error}</div>}
      </div>

      {/* Confirm Dialog */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <AlertTriangle size={24} color="var(--gold-amber)" />
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--gold-bright)', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                  START ROUND 1?
                </div>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,248,231,0.6)', lineHeight: 1.6 }}>
                  This will begin the live quiz for all participants in the waiting room.<br />
                  This action cannot be undone.
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-outline btn-full" onClick={() => setConfirm(false)}>Cancel</button>
              <button id="confirm-start-btn" className="btn btn-gold btn-full" onClick={handleStart} disabled={starting}>
                {starting ? 'Starting...' : 'Start Round 1'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Status Table */}
      <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <div className="section-title" style={{ fontSize: '0.8rem', marginBottom: '1rem' }}>Live Team Status</div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Lead</th>
              <th>Acknowledged</th>
              <th>Status</th>
              <th>Score</th>
              <th>✓/✗/—</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {teams.map(t => (
              <tr key={t.team_id}>
                <td style={{ fontWeight: 600 }}>{t.team_name}</td>
                <td style={{ color: 'rgba(255,248,231,0.6)', fontSize: '0.85rem' }}>{t.team_lead_name}</td>
                <td>
                  <span className={`badge ${t.rules_acknowledged ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '0.65rem' }}>
                    {t.rules_acknowledged ? '✓ Yes' : '✗ No'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${
                    t.status === 'SUBMITTED' ? 'badge-green' :
                    t.status === 'IN_PROGRESS' ? 'badge-teal' :
                    t.status === 'WAITING' ? 'badge-orange' : 'badge-gray'
                  }`} style={{ fontSize: '0.65rem' }}>{t.status}</span>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: t.score > 0 ? 'var(--ocean-aqua)' : t.score < 0 ? '#f87171' : 'inherit' }}>
                  {t.score}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'rgba(255,248,231,0.5)' }}>
                  {t.correct_count}/{t.wrong_count}/{t.skipped_count}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'rgba(255,248,231,0.5)' }}>
                  {t.completion_time_seconds ? `${t.completion_time_seconds}s` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Leaderboard Tab ───────────────────────────────────────────────────────
function LeaderboardTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewTop15, setPreviewTop15] = useState(null);
  const [confirmDlg, setConfirmDlg] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [qualified, setQualified] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api.get('/api/admin/leaderboard');
      setRows(data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleExportCSV() {
    const blob = await api.get('/api/admin/export/results');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'cyberhub_results.csv'; a.click();
  }

  async function handlePreview() {
    try {
      const data = await api.get('/api/admin/qualified-teams/preview');
      setPreviewTop15(data.top_15);
    } catch (e) { alert(e.message); }
  }

  async function handleConfirm() {
    setConfirming(true);
    try {
      await api.post('/api/admin/qualified-teams/confirm');
      setQualified(true); setMsg('Top 15 confirmed and stored in qualified_teams.');
      setConfirmDlg(false); setPreviewTop15(null);
    } catch (e) { alert(e.message); }
    finally { setConfirming(false); }
  }

  const medalColor = (rank) => rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : 'inherit';

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center' }}><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <h2 className="section-title" style={{ fontSize: '1.1rem' }}>Round 1 Leaderboard</h2>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={handleExportCSV}><Download size={13} /> Export CSV</button>
          <button className="btn btn-teal btn-sm" onClick={handlePreview}><Star size={13} /> Preview Top 15</button>
          {!qualified && previewTop15 && (
            <button className="btn btn-gold btn-sm" onClick={() => setConfirmDlg(true)}><Trophy size={13} /> Confirm Top 15</button>
          )}
          <button className="btn btn-outline btn-sm" onClick={load}><RefreshCw size={13} /></button>
        </div>
      </div>

      {msg && <div className="success-banner" style={{ marginBottom: '1rem' }}>{msg}</div>}

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.08em', color: 'rgba(255,248,231,0.35)', marginBottom: '1rem' }}>
        Ranked: SCORE DESC → COMPLETION TIME ASC (server-authoritative)
      </div>

      <div className="glass-card" style={{ padding: '1.5rem', overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Team</th>
              <th>Lead</th>
              <th>Score</th>
              <th>✓</th><th>✗</th><th>—</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.team_id} style={{ background: r.rank <= 15 && previewTop15 ? 'rgba(244,197,66,0.04)' : undefined }}>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, color: medalColor(r.rank), fontSize: '1rem' }}>
                  {r.rank === 1 ? '🥇' : r.rank === 2 ? '🥈' : r.rank === 3 ? '🥉' : `#${r.rank}`}
                </td>
                <td style={{ fontWeight: 600 }}>{r.team_name}</td>
                <td style={{ color: 'rgba(255,248,231,0.6)', fontSize: '0.85rem' }}>{r.team_lead_name}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: r.score > 0 ? 'var(--ocean-aqua)' : '#f87171' }}>{r.score}</td>
                <td style={{ color: '#4ade80', fontFamily: 'var(--font-mono)' }}>{r.correct_count}</td>
                <td style={{ color: '#f87171', fontFamily: 'var(--font-mono)' }}>{r.wrong_count}</td>
                <td style={{ color: 'var(--gold-amber)', fontFamily: 'var(--font-mono)' }}>{r.skipped_count}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'rgba(255,248,231,0.5)' }}>
                  {r.completion_time_seconds ? `${r.completion_time_seconds}s` : '—'}
                </td>
                <td>
                  <span className={`badge ${r.status === 'SUBMITTED' ? 'badge-green' : r.status === 'IN_PROGRESS' ? 'badge-teal' : 'badge-gray'}`} style={{ fontSize: '0.6rem' }}>
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p style={{ textAlign: 'center', color: 'rgba(255,248,231,0.3)', padding: '2rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
            No attempts yet. Standings will appear here when teams complete Round 1.
          </p>
        )}
      </div>

      {/* Preview Top 15 */}
      {previewTop15 && (
        <div className="glass-card" style={{ padding: '1.5rem', marginTop: '1.5rem', border: '1px solid rgba(244,197,66,0.25)' }}>
          <div className="section-title" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
            ⚓ THE CHOSEN CREW — TOP 15
          </div>
          <div style={{ display: 'grid', gap: '0.5rem' }}>
            {previewTop15.map(r => (
              <div key={r.team_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', background: 'rgba(244,197,66,0.05)', borderRadius: 'var(--r-sm)', border: '1px solid rgba(244,197,66,0.1)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--gold-bright)', fontWeight: 700 }}>#{r.rank}</span>
                <span style={{ fontWeight: 600, flex: 1, marginLeft: '1rem' }}>{r.team_name}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--ocean-aqua)', marginRight: '1rem' }}>{r.score} pts</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'rgba(255,248,231,0.4)' }}>
                  {r.completion_time_seconds ? `${r.completion_time_seconds}s` : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmDlg && (
        <div className="modal-overlay" onClick={() => setConfirmDlg(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="section-title" style={{ fontSize: '1rem', marginBottom: '1rem' }}>Confirm Top 15?</div>
            <p style={{ color: 'rgba(255,248,231,0.6)', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
              This will store the Top 15 in the <code style={{ color: 'var(--gold-bright)' }}>qualified_teams</code> table.
              Original Round 1 data will be preserved.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-outline btn-full" onClick={() => setConfirmDlg(false)}>Cancel</button>
              <button className="btn btn-gold btn-full" onClick={handleConfirm} disabled={confirming}>
                {confirming ? 'Storing...' : 'Confirm Top 15'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Dashboard Shell ─────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user, signOut } = useAuth();

  const navLinks = [
    { to: '/admin/overview',     icon: LayoutDashboard,  label: 'Overview' },
    { to: '/admin/leaderboard',  icon: Trophy,           label: 'Leaderboard' },
  ];

  return (
    <div className="admin-layout ocean-bg" style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div style={{ padding: '0 1.5rem 1.5rem', borderBottom: '1px solid rgba(244,197,66,0.1)' }}>
          <div className="display-title" style={{ fontSize: '1rem', lineHeight: 1.2 }}>CYBERHUB</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.15em', color: 'rgba(255,248,231,0.35)', textTransform: 'uppercase', marginTop: '0.25rem' }}>
            Captain's Command Center
          </div>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {navLinks.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid rgba(244,197,66,0.1)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'rgba(255,248,231,0.3)', marginBottom: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Admin
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,248,231,0.5)', marginBottom: '0.75rem', wordBreak: 'break-all' }}>
            {user?.email}
          </div>
          <button className="btn btn-outline btn-sm btn-full" onClick={signOut}>
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <main className="admin-main">
        <Routes>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewTab />} />
          <Route path="leaderboard" element={<LeaderboardTab />} />
          <Route path="*" element={<Navigate to="overview" replace />} />
        </Routes>
      </main>
    </div>
  );
}
