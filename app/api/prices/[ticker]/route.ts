import { NextResponse } from 'next/server';
import { DEFAULT_SYMBOLS } from '@/lib/constants/defaultSymbols';
import { fetchLiveQuote, fetchCandleHistory } from '@/lib/ingestion/finnhubClient';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { ticker: string } }
) {
  try {
    const ticker = params.ticker.toUpperCase();
    const { searchParams } = new URL(request.url);
    const count = Number(searchParams.get('count') || '60');
    const resolution = searchParams.get('resolution') || 'D';

    const symbol = DEFAULT_SYMBOLS.find((s) => s.ticker === ticker);
    const assetType = symbol ? symbol.asset_type : (ticker.length === 6 ? 'forex' : 'stock');

    const [quote, candles] = await Promise.all([
      fetchLiveQuote(ticker, assetType),
      fetchCandleHistory(ticker, assetType, resolution, count),
    ]);

    return NextResponse.json({
      success: true,
      ticker,
      quote,
      candles,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
