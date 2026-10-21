import { NextResponse } from 'next/server';
import { regenerateDayIndoorData } from '@/backend/services/ai.service';

export async function POST(req: Request) {
  try {
    const { destination, dayNumber, preferences } = await req.json();
    if (!destination || !dayNumber) {
      return NextResponse.json({ error: 'Missing destination or dayNumber' }, { status: 400 });
    }

    const data = await regenerateDayIndoorData(destination, dayNumber, preferences);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('Error in regenerate-day API:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
