import { NextResponse } from 'next/server';
import { getDestinationTrends } from '@/backend/services/trends.service';
import { getCachedTrends, setCachedTrends } from '@/backend/services/cache.service';

export async function GET(req: Request, { params }: { params: { destination: string } }) {
  const { destination } = params;
  let trends = await getCachedTrends(destination);
  if (!trends) {
    trends = await getDestinationTrends(destination);
    await setCachedTrends(destination, trends);
  }
  return NextResponse.json(trends);
}