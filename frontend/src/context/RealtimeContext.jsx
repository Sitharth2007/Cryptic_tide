import { useEffect, useState, createContext, useContext, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

const RealtimeContext = createContext(null);

/**
 * Supabase Realtime — listens for round status changes.
 * When admin sets round status to ACTIVE, participants are notified without refresh.
 */
export function RealtimeProvider({ children }) {
  const [roundStatus, setRoundStatus] = useState(null);
  const [realtimeReady, setRealtimeReady] = useState(false);

  useEffect(() => {
    // Subscribe to rounds table changes
    const channel = supabase
      .channel('public:rounds')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rounds', filter: 'id=eq.round-1' },
        (payload) => {
          const newStatus = payload.new?.status;
          if (newStatus) setRoundStatus(newStatus);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setRealtimeReady(true);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <RealtimeContext.Provider value={{ roundStatus, setRoundStatus, realtimeReady }}>
      {children}
    </RealtimeContext.Provider>
  );
}

export const useRealtime = () => {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be inside RealtimeProvider');
  return ctx;
};
