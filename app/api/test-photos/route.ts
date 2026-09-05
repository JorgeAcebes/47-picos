import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const limit = 20;
  
  const { data: ascData } = await supabase!
    .from("ascents")
    .select("id, user_id, summit_id, created_at, achieved_on")
    .order("created_at", { ascending: false })
    .limit(limit);

  const { data: expData } = await supabase!
    .from("experience_records")
    .select("id, user_id, experience_id, created_at, achieved_on")
    .order("created_at", { ascending: false })
    .limit(limit);

  const combined = [
    ...(ascData || []).map(a => ({ ...a, type: "ascent" })),
    ...(expData || []).map(e => ({ ...e, type: "experience" }))
  ];

  const userIds = [...new Set(combined.map(item => item.user_id))];
  const summitIds = [...new Set(combined.map((item: any) => item.summit_id || item.experience_id))];

  const { data: photosData, error } = await supabase!
    .from('summit_photos')
    .select('user_id, summit_id, public_url')
    .in('user_id', userIds)
    .in('summit_id', summitIds);

  return NextResponse.json({
    userIds,
    summitIds,
    photosData,
    error
  });
}
