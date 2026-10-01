import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './auth-context';

export function usePendingRequests() {
  const [hasPendingRequests, setHasPendingRequests] = useState(false);
  const { session, profile } = useAuth();

  useEffect(() => {
    let mounted = true;
    let channel: any = null;

    if (!supabase || !session) {
      setHasPendingRequests(false);
      return;
    }

    async function checkPending() {
      if (!supabase || !session) return;
      if (profile && profile.is_public) {
        if (mounted) setHasPendingRequests(false);
        return;
      }

      const { data: pendingConns } = await supabase
        .from('connections')
        .select('status')
        .eq('following_id', session.user.id)
        .eq('status', 'pending')
        .limit(1);

      if (mounted) {
        setHasPendingRequests(Boolean(pendingConns && pendingConns.length > 0));
      }
    }

    checkPending();

    channel = supabase.channel(`public:connections:${session.user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connections',
          filter: `following_id=eq.${session.user.id}`,
        },
        () => {
          checkPending();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [session, profile]);

  return hasPendingRequests;
}
