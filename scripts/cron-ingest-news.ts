import path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config();

import { DEFAULT_SYMBOLS } from '../lib/constants/defaultSymbols';
import { fetchMarketauxNews } from '../lib/ingestion/marketauxClient';
import { getSupabaseServerClient } from '../lib/supabase/server';

async function runNewsIngestion() {
  console.log(`[${new Date().toISOString()}] Starting News & Sentiment Ingestion...`);

  const supabase = getSupabaseServerClient();
  const tickerList = DEFAULT_SYMBOLS.map((s) => s.ticker);
  
  const news = await fetchMarketauxNews(tickerList);
  console.log(`Fetched ${news.length} news articles.`);

  // Save to Turso / Local SQLite Database
  const { saveNewsArticles } = await import('../lib/db/localDb');
  await saveNewsArticles(news);
  console.log(`[${new Date().toISOString()}] News ingestion complete and saved to Turso / SQLite.`);
}

runNewsIngestion().catch(console.error);
