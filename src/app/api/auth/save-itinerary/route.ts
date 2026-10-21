import { NextResponse } from 'next/server';
import { createClient } from '@/backend/db/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { itineraryId, destination, preferences, itineraryData } = await req.json();
    if (!itineraryId) {
      return NextResponse.json({ error: 'Itinerary ID is required' }, { status: 400 });
    }

    const supabase = createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in to save itineraries.' }, { status: 401 });
    }

    // Ensure the user exists in public.users table (to satisfy foreign key constraint)
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
        console.error('Failed to auto-create public user profile:', userInsertError);
        if (userInsertError.message.includes('row-level security') || userInsertError.message.includes('RLS')) {
          return NextResponse.json({ 
            error: 'Database security policy (RLS) is blocking profile creation. Please go to your Supabase SQL Editor and run the following command to fix it:\n\nALTER TABLE public.users DISABLE ROW LEVEL SECURITY;' 
          }, { status: 500 });
        }
        return NextResponse.json({ error: `Failed to initialize user profile: ${userInsertError.message}` }, { status: 500 });
      }
    }

    // Update itinerary to link it to the authenticated user
    let { data, error } = await supabase
      .from('itineraries')
      .update({ user_id: user.id })
      .eq('id', itineraryId)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If no row was updated, the itinerary was not saved during generation (due to RLS or other database errors).
    // We perform a fallback insert to create it in the database now.
    if (!data || data.length === 0) {
      if (destination && itineraryData) {
        const { data: insertedData, error: insertError } = await supabase
          .from('itineraries')
          .insert({
            id: itineraryId,
            user_id: user.id,
            destination,
            preferences: preferences || {},
            itinerary_data: itineraryData,
            share_token: Math.random().toString(36).substring(2, 10),
            vibe_photo_ids: preferences?.vibePhotoIds || [],
            vibe_tags: preferences?.vibeTags || []
          })
          .select();

        if (insertError) {
          console.error('Failed to insert missing itinerary during save:', insertError);
          return NextResponse.json({ error: `Failed to save itinerary: ${insertError.message}` }, { status: 500 });
        }
        data = insertedData;
      } else {
        return NextResponse.json({ 
          error: 'This itinerary was generated before database setup was complete. Please generate a new itinerary to save it.' 
        }, { status: 404 });
      }
    }

    return NextResponse.json({ success: true, message: 'Itinerary saved to your account.', data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
