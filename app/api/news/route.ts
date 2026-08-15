import { NextResponse } from 'next/server';
import { fetchMarketauxNews } from '@/lib/ingestion/marketauxClient';
import { DEFAULT_SYMBOLS } from '@/lib/constants/defaultSymbols';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('symbol') || searchParams.get('ticker');
    
    let tickerList = DEFAULT_SYMBOLS.map((s) => s.ticker);
    if (ticker) {
      tickerList = [ticker.toUpperCase()];
    }

    const news = await fetchMarketauxNews(tickerList);

    return NextResponse.json({
      success: true,
      count: news.length,
      timestamp: new Date().toISOString(),
      data: news,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
