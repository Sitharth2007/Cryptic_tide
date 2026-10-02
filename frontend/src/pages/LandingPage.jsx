import { Link } from 'react-router-dom';
import { Compass, Shield, Zap, Trophy, Clock, Users } from 'lucide-react';

const PALETTE = ['#F4C542','#087E8B','#FF7A18','#00A6A6','#D99A2B','#E85D04'];

function CompassSVG() {
  return (
    <svg viewBox="0 0 120 120" width="120" height="120" style={{ filter: 'drop-shadow(0 0 20px rgba(244,197,66,0.4))' }}>
      <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(244,197,66,0.2)" strokeWidth="2" />
      <circle cx="60" cy="60" r="45" fill="none" stroke="rgba(244,197,66,0.1)" strokeWidth="1" />
      {[0,45,90,135,180,225,270,315].map(a => (
        <line key={a}
          x1={60 + 48 * Math.sin(a * Math.PI/180)}
          y1={60 - 48 * Math.cos(a * Math.PI/180)}
          x2={60 + 55 * Math.sin(a * Math.PI/180)}
          y2={60 - 55 * Math.cos(a * Math.PI/180)}
          stroke="rgba(244,197,66,0.4)" strokeWidth="1.5"
        />
      ))}
      <text x="60" y="14" textAnchor="middle" fill="#F4C542" fontSize="10" fontWeight="bold">N</text>
      <text x="60" y="112" textAnchor="middle" fill="rgba(244,197,66,0.5)" fontSize="9">S</text>
      <text x="108" y="64" textAnchor="middle" fill="rgba(244,197,66,0.5)" fontSize="9">E</text>
      <text x="12" y="64" textAnchor="middle" fill="rgba(244,197,66,0.5)" fontSize="9">W</text>
      {/* North needle */}
      <polygon points="60,20 55,60 60,55 65,60" fill="#F4C542" />
      {/* South needle */}
      <polygon points="60,100 55,60 60,65 65,60" fill="rgba(255,255,255,0.2)" />
      <circle cx="60" cy="60" r="5" fill="#F4C542" />
      <circle cx="60" cy="60" r="2" fill="#06131F" />
    </svg>
  );
}

const features = [
  { icon: Zap,    title: 'Live Quiz',        desc: '25 technical questions, 10 seconds each.' },
  { icon: Users,  title: 'Team Competition', desc: '2–3 members per team. One attempt.' },
  { icon: Clock,  title: 'Server Timer',     desc: 'Server-authoritative. No cheating.' },
  { icon: Shield, title: 'Secure Platform',  desc: 'Scores calculated server-side only.' },
  { icon: Trophy, title: 'Top 15 Qualify',   desc: 'Ranked by score, then completion time.' },
  { icon: Compass,'title': 'Technical Topics', desc: 'HTML, CSS, JS, Web Tech & Security.' },
];

export default function LandingPage() {
  return (
    <div className="ocean-bg" style={{ minHeight: '100vh' }}>
      {/* Hero */}
      <section style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem', position: 'relative', overflow: 'hidden' }}>
        {/* Background circles */}
        <div style={{ position: 'absolute', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(8,126,139,0.08) 0%, transparent 70%)', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', pointerEvents: 'none' }} />

        <div className="animate-fade-in-up" style={{ maxWidth: 720, zIndex: 1 }}>
          <div className="animate-float" style={{ marginBottom: '2rem' }}>
            <CompassSVG />
          </div>

          <div style={{ marginBottom: '0.5rem' }}>
            <span className="badge badge-teal">CyberHub Technical Club</span>
          </div>

          <h1 className="display-title" style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', marginBottom: '0.5rem' }}>
            CYBERHUB
          </h1>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem, 3vw, 1.5rem)', color: 'var(--gold-warm)', letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 400, marginBottom: '2rem' }}>
            THE TECHNICAL VOYAGE
          </h2>

          <p style={{ fontSize: '1.15rem', color: 'rgba(255,248,231,0.7)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
            Navigate the challenges. Outsmart the storm. Claim the treasure.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '1.5rem', marginBottom: '3rem' }}>
            <span className="badge badge-gold">25 Questions</span>
            <span className="badge badge-teal">10 Seconds Each</span>
            <span className="badge badge-orange">Top 15 Qualify</span>
            <span className="badge badge-gray">Team-Based</span>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/login" className="btn btn-gold btn-lg animate-glow">
              ⚓ Enter The Voyage
            </Link>
            <a href="#event-info" className="btn btn-outline btn-lg">
              Learn More
            </a>
          </div>
        </div>
      </section>

      {/* Wave */}
      <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, rgba(244,197,66,0.3), transparent)', margin: '0 2rem' }} />

      {/* Features */}
      <section id="event-info" style={{ padding: '5rem 1.5rem' }}>
        <div className="container">
          <h2 className="section-title" style={{ textAlign: 'center', fontSize: '1.75rem', marginBottom: '0.75rem' }}>
            The Voyage Ahead
          </h2>
          <p style={{ textAlign: 'center', color: 'rgba(255,248,231,0.5)', marginBottom: '3rem' }}>
            What awaits brave crews in Round 1
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="parchment-card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', padding: '1.5rem' }}>
                <div style={{ width: 44, height: 44, flexShrink: 0, borderRadius: '10px', background: 'rgba(244,197,66,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={20} color="var(--gold-bright)" />
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', letterSpacing: '0.05em', color: 'var(--gold-bright)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>{title}</div>
                  <div style={{ fontSize: '0.9rem', color: 'rgba(255,248,231,0.6)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Scoring */}
      <section style={{ padding: '4rem 1.5rem', background: 'rgba(11,41,66,0.3)' }}>
        <div className="container-md">
          <h2 className="section-title" style={{ textAlign: 'center', fontSize: '1.5rem', marginBottom: '2rem' }}>Scoring System</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Correct Answer', val: '+10', cls: 'badge-green' },
              { label: 'Wrong Answer',   val: '−5',  cls: 'badge-red' },
              { label: 'Skipped',        val: '−10', cls: 'badge-orange' },
              { label: 'Timeout',        val: '−10', cls: 'badge-gray' },
            ].map(row => (
              <div key={row.label} className="glass-card" style={{ padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'rgba(255,248,231,0.7)' }}>{row.label}</span>
                <span className={`badge ${row.cls}`} style={{ fontSize: '1rem', fontWeight: 800 }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '5rem 1.5rem', textAlign: 'center' }}>
        <h2 className="display-title" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', marginBottom: '1rem' }}>
          Ready to Set Sail?
        </h2>
        <p style={{ color: 'rgba(255,248,231,0.6)', marginBottom: '2rem' }}>
          Log in with your registered email to join the voyage.
        </p>
        <Link to="/login" className="btn btn-gold btn-lg">
          ⚓ Enter The Voyage
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(244,197,66,0.1)', padding: '2rem 1.5rem', textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.2em', color: 'rgba(255,248,231,0.3)' }}>
          © 2026 CYBERHUB TECHNICAL CLUB — THE TECHNICAL VOYAGE
        </p>
      </footer>
    </div>
  );
}
