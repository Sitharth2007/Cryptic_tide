import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/apiClient';
import { Anchor, Users, LogOut, ChevronRight } from 'lucide-react';

export default function ParticipantDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/participant/team')
      .then(data => setTeamData(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-center ocean-bg"><div className="spinner" /></div>;

  return (
    <div className="ocean-bg" style={{ minHeight: '100vh', padding: '2rem 1.5rem' }}>
      <div className="container-md">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 className="display-title" style={{ fontSize: '1.5rem' }}>CYBERHUB</h1>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.15em', color: 'rgba(255,248,231,0.4)', textTransform: 'uppercase' }}>Participant Dashboard</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={signOut}>
            <LogOut size={14} />
            Sign Out
          </button>
        </div>

        {error && <div className="error-banner" style={{ marginBottom: '1.5rem' }}>{error}</div>}

        {/* Welcome Card */}
        <div className="parchment-card animate-fade-in-up" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.15em', color: 'var(--ocean-aqua)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Welcome, Captain
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', color: 'var(--gold-bright)', letterSpacing: '0.05em' }}>
            {teamData?.team?.team_lead_name || user?.email}
          </h2>
          <div style={{ marginTop: '0.75rem' }}>
            <span className="badge badge-green">✓ Team Verified</span>
          </div>
        </div>

        {/* Team Info */}
        {teamData && (
          <div className="parchment-card animate-fade-in-up" style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '0.12em', color: 'var(--gold-bright)', textTransform: 'uppercase', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={14} /> Crew Manifest
            </div>

            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'rgba(255,248,231,0.4)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Ship Name</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--gold-bright)', letterSpacing: '0.05em' }}>
                  {teamData.team?.team_name}
                </div>
              </div>

              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'rgba(255,248,231,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Captain (Team Lead)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(8,126,139,0.1)', borderRadius: 'var(--r-md)', border: '1px solid rgba(8,126,139,0.2)' }}>
                  <Anchor size={16} color="var(--ocean-aqua)" />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{teamData.team?.team_lead_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'rgba(255,248,231,0.4)' }}>{teamData.team?.team_lead_email}</div>
                  </div>
                </div>
              </div>

              {teamData.members?.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', letterSpacing: '0.1em', color: 'rgba(255,248,231,0.4)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Crew Members</div>
                  <div style={{ display: 'grid', gap: '0.5rem' }}>
                    {teamData.members.map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 1rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--r-sm)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(244,197,66,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.75rem', color: 'var(--gold-bright)' }}>
                          {i + 1}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.9rem' }}>{m.name}</div>
                          {m.email && <div style={{ fontSize: '0.75rem', color: 'rgba(255,248,231,0.35)' }}>{m.email}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          className="btn btn-gold btn-full btn-lg animate-glow"
          onClick={() => navigate('/participant/waiting')}
        >
          Proceed to Waiting Room
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
