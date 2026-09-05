import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

export function usePendingRequests() {
  const [hasPendingRequests, setHasPendingRequests] = useState(false);

  useEffect(() => {
    let mounted = true;
    let channel: any = null;
    
    async function checkPending() {
      if (!supabase) return;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_public')
        .eq('id', session.user.id)
        .single();
        
      if (profile && !profile.is_public) {
        const { data: pendingConns } = await supabase
          .from('connections')
          .select('status')
          .eq('following_id', session.user.id)
          .eq('status', 'pending')
          .limit(1);
          
        if (mounted && pendingConns && pendingConns.length > 0) {
          setHasPendingRequests(true);
        } else if (mounted) {
          setHasPendingRequests(false);
        }
      }
    }
    
    checkPending();
    
    // Set up real-time listener for connections
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session && mounted && supabase) {
          channel = supabase.channel('public:connections')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'connections', filter: `following_id=eq.${session.user.id}` }, payload => {
              checkPending();
            })
            .subscribe();
        }
      });
    }

    return () => { 
      mounted = false; 
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return hasPendingRequests;
}
