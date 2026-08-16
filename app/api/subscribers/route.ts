import { NextResponse } from 'next/server';
import { getSubscriberCount, getAllSubscribers } from '@/lib/db/localDb';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    const [count, subscribers] = await Promise.all([
      getSubscriberCount(),
      getAllSubscribers(),
    ]);

    return NextResponse.json({
      success: true,
      count,
      subscribers,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message, count: 1, subscribers: [] },
      { status: 500 }
    );
  }
}
