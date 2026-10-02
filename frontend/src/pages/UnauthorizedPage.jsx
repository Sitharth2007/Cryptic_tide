import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldOff, LogOut } from 'lucide-react';

export default function UnauthorizedPage() {
  const { signOut } = useAuth();

  return (
    <div className="ocean-bg page-center" style={{ textAlign: 'center' }}>
      <div className="animate-fade-in-up" style={{ maxWidth: 440, zIndex: 1 }}>
        <ShieldOff size={48} color="var(--gold-amber)" style={{ marginBottom: '1.5rem' }} />
        <h1 className="display-title" style={{ fontSize: '2rem', marginBottom: '1rem' }}>ACCESS DENIED</h1>
        <p style={{ color: 'rgba(255,248,231,0.6)', marginBottom: '2rem' }}>
          This email is not registered as a team lead for the voyage, or you do not have permission.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={signOut} className="btn btn-gold">
            <LogOut size={16} style={{ marginRight: '0.4rem' }} /> Sign Out & Try Different Email
          </button>
          <Link to="/" onClick={signOut} className="btn btn-outline">← Return to Shore</Link>
        </div>
      </div>
    </div>
  );
}
