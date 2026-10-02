import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="ocean-bg page-center" style={{ textAlign: 'center' }}>
      <div className="animate-fade-in-up" style={{ maxWidth: 440, zIndex: 1 }}>
        <ShieldOff size={48} color="var(--gold-amber)" style={{ marginBottom: '1.5rem' }} />
        <h1 className="display-title" style={{ fontSize: '2rem', marginBottom: '1rem' }}>ACCESS DENIED</h1>
        <p style={{ color: 'rgba(255,248,231,0.6)', marginBottom: '2rem' }}>
          You do not have permission to access this section of the voyage.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-outline">← Return to Shore</Link>
          <Link to="/login" className="btn btn-gold">Login</Link>
        </div>
      </div>
    </div>
  );
}
