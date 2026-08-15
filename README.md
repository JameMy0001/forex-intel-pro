# Nexus Intel Pro - Real-Time Forex & Stock News Intelligence + Probability Engine

> ระบบค้นหาและรวบรวมข้อมูลข่าวสาร Forex & Stock อัตโนมัติ พร้อมคำนวณความน่าจะเป็น (Probability Engine), สังเคราะห์บทวิเคราะห์เชิงลึกด้วย AI (Gemini 2.0 Flash) และแจ้งเตือนผ่าน Telegram Bot แบบ Real-time 100%

---

## 🌟 ฟีเจอร์หลัก (Key Features)

1. **Self-Contained Local Database (SQLite in `data/intel.db`):**
   - **ไม่ต้องใช้ Supabase ก็ได้!** ระบบมีฐานข้อมูล **SQLite ในตัวแบบ Zero-Config** จัดเก็บราคา, ข่าว, Indicators, สัญญาณ และ Alerts Log ลงในเครื่องของคุณโดยอัตโนมัติ ไม่ต้องสมัครคลาวด์ ไม่ต้องผูกบัตร ไม่ต้องกลัวโปรเจกต์โดน Pause
2. **Real-time Price & Market Ingestion:**
   - ดึงราคา Live Quote และประวัติแท่งเทียน (Candlestick Data) ของ Forex Major Pairs (EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CHF, USD/CAD, XAU/USD Gold) และหุ้น MegaCap (AAPL, NVDA, TSLA, MSFT, AMZN, GOOGL, SPY) จาก Finnhub API และ Live Market Feeds
3. **Real-time News Sentiment Stream:**
   - รวบรวมข่าวสารการเงินระดับโลกแบบสดใหม่ วิเคราะห์ Sentiment Score (-1.0 ถึง +1.0) จาก Marketaux และ Finnhub
4. **Multi-Factor Statistical Probability Engine:**
   - คำนวณความน่าจะเป็นของทิศทางราคา (Win Probability %) โดยผสาน:
     - **News Sentiment Score** (40-45%)
     - **Technical Momentum** (RSI 14, MACD Histogram, Bollinger Bands) (30-35%)
     - **Macro Trend Filter** (EMA 20, EMA 50, EMA 200) (20-30%)
   - สรุปทิศทางสัญญาณ: `STRONG_BUY`, `BUY`, `NEUTRAL`, `SELL`, `STRONG_SELL`
   - กำหนดจุดเข้า (**Entry**), **Stop Loss** (อิงความผันผวน ATR 14) และ **Take Profit 1 & 2** (Risk/Reward 1:2.0+)
5. **AI Deep Market Intelligence (Google Gemini 2.0 Flash):**
   - วิเคราะห์เจาะลึก Macroeconomic Drivers, นโยบายธนาคารกลาง (Fed/ECB/BOJ), ปัจจัยเสี่ยง (Downside Risks) และ Invalidation Levels
6. **Trading Terminal UI (Dark Theme ระดับ Bloomberg / TradingView):**
   - Live Watchlist Matrix พร้อม Speedometer Probability Gauges
   - Interactive Candlestick / Area Chart พร้อม EMA Overlay
   - Live News Feed พร้อม Sentiment Badges
   - หน้าเจาะลึกรายตัว `/symbol/[ticker]` พร้อมปุ่ม Re-Analyze with AI
7. **Automated Alerting & Ingestion:**
   - Telegram Bot ส่ง Push Alert สัญญาณ High Probability ทันทีที่มีการ Confluence
   - GitHub Actions Cron Workflows สำหรับอัปเดตราคาและข่าวอัตโนมัติ 24/7

---

## 🚀 วิธีติดตั้งและรันใช้งานจริง (Quick Start)

### 1. ติดตั้ง Dependencies
```bash
npm install
```

### 2. ตั้งค่า Environment Variables (`.env.local`)
คัดลอกไฟล์ `.env.example` เป็น `.env.local` แล้วใส่ API Key:
```bash
cp .env.example .env.local
```

ตัวอย่างข้อมูลใน `.env.local`:
```env
# 1. Finnhub (ราคาหุ้น & forex ฟรี 60 calls/min) - https://finnhub.io
FINNHUB_API_KEY=your_finnhub_key

# 2. Marketaux (ข่าวและ sentiment ฟรี) - https://marketaux.com
MARKETAUX_API_KEY=your_marketaux_key

# 3. Google Gemini API (AI สังเคราะห์บทวิเคราะห์ฟรี) - https://aistudio.google.com
GEMINI_API_KEY=your_gemini_key

# 4. Supabase (Database ฟรี 500MB) - https://supabase.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 5. Telegram Bot (สำหรับแจ้งเตือนสัญญาณ) - สร้างผ่าน @BotFather
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### 3. ติดตั้งฐานข้อมูล Supabase
1. เข้าไปที่แดชบอร์ด Supabase -> SQL Editor
2. รันคำสั่ง SQL จากไฟล์ [`supabase/schema.sql`](supabase/schema.sql) เพื่อสร้างตารางและดัชนี
3. รันคำสั่ง SQL จากไฟล์ [`supabase/seed.sql`](supabase/seed.sql) เพื่อลงทะเบียนคู่เงินและหุ้นเริ่มต้น

### 4. รันระบบ Local Development
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

---

## 🛠 คำสั่ง Scripts ที่มีให้ใช้งาน

| คำสั่ง | การทำงาน |
|---|---|
| `npm run dev` | เปิดเซิร์ฟเวอร์พัฒนา Local |
| `npm run build` | คอมไพล์โปรเจกต์เป็น Production Bundle |
| `npm run cron:prices` | รันสคริปต์ดึงราคา Live + คำนวณ Signal + ส่ง Alert Telegram ทันที |
| `npm run cron:news` | รันสคริปต์ดึงข่าวและวิเคราะห์ Sentiment จาก Marketaux ทันที |
| `npm run backtest` | รันการจำลองและประเมินผลความแม่นยำย้อนหลังของ Probability Engine |

---

## 🌐 การ Deploy ขึ้น Production (Vercel + GitHub Actions)

1. **Deploy บน Vercel:**
   - Import โปรเจกต์จาก GitHub เข้า Vercel
   - ตั้งค่า Environment Variables ให้ครบตาม `.env.local`
2. **ตั้งค่า GitHub Actions Secrets:**
   - ไปที่ Repo Settings -> Secrets and variables -> Actions
   - เพิ่ม `FINNHUB_API_KEY`, `MARKETAUX_API_KEY`, `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
   - GitHub Actions จะรันอัปเดตราคา (`ingest-prices.yml`) ทุก 5 นาที และข่าว (`ingest-news.yml`) ทุก 15 นาทีอัตโนมัติ
