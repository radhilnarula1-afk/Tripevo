import { NextResponse } from 'next/server';
import { createClient } from '@/backend/db/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { itineraryId, partnerName, affiliateType, destinationUrl } = await req.json();

    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Ensure user exists in public.users to satisfy foreign key constraint
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingUser) {
        const { error: userInsertError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url || null
          });
        if (userInsertError) {
          console.error('Failed to create user during click tracking:', userInsertError);
        }
      }
    }

    const { data, error } = await supabase
      .from('affiliate_clicks')
      .insert({
        itinerary_id: itineraryId || null,
        user_id: user?.id || null,
        affiliate_type: affiliateType, // must match 'hotel', 'experience', or 'flight'
        partner_name: partnerName,
        destination_url: destinationUrl,
      })
      .select();

    if (error) {
      console.error('Affiliate click track DB error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    console.error('Affiliate click track router error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
