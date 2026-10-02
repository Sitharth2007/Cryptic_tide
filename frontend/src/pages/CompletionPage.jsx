import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/apiClient';
import { Anchor, CheckCircle } from 'lucide-react';

export default function CompletionPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/participant/completion')
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-center ocean-bg"><div className="spinner" /></div>;

  return (
    <div className="ocean-bg page-center" style={{ textAlign: 'center' }}>
      <div className="animate-fade-in-up" style={{ maxWidth: 560, zIndex: 1 }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }} className="animate-float">⚓</div>

        <div style={{ marginBottom: '1rem' }}>
          <span className="badge badge-green">
            <CheckCircle size={12} /> Round 1 Complete
          </span>
        </div>

        <h1 className="display-title" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.5rem)', marginBottom: '1.25rem' }}>
          ROUND 1 HAS BEEN<br />SUCCESSFULLY FINISHED
        </h1>

        <div className="parchment-card" style={{ marginBottom: '2rem', lineHeight: 2 }}>
          <p style={{ color: 'rgba(255,248,231,0.7)', fontSize: '1rem' }}>
            Thank you for participating, Captain.
          </p>
          <p style={{ color: 'rgba(255,248,231,0.6)', fontSize: '0.95rem' }}>
            The results will be announced in the group.
          </p>
          <hr className="divider" />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', letterSpacing: '0.08em', color: 'rgba(255,248,231,0.35)' }}>
            Your attempt has been locked. No further changes can be made.
          </p>
          {data?.submitted_at && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'rgba(255,248,231,0.25)', marginTop: '0.5rem' }}>
              Submitted: {new Date(data.submitted_at).toLocaleTimeString()}
            </p>
          )}
        </div>

        <div style={{ fontStyle: 'italic', color: 'rgba(255,248,231,0.45)', fontSize: '0.9rem', lineHeight: 1.8 }}>
          Your crew fought bravely.<br />
          The treasure awaits those who proved worthy.<br />
          Fair winds to all sailors.
        </div>

        <div style={{ marginTop: '2rem' }}>
          <Link to="/" className="btn btn-outline">← Return to Shore</Link>
        </div>
      </div>
    </div>
  );
}
