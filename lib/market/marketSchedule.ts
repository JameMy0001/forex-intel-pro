import { AssetType } from '../types';

export interface MarketStatusResult {
  isOpen: boolean;
  sessionName: string;
  reason: string;
  bangkokTime: string;
}

/**
 * Get accurate live market open/close status in Asia/Bangkok time
 */
export function getMarketStatus(assetType: AssetType = 'forex', ticker?: string): MarketStatusResult {
  // Get current date & time in Bangkok timezone (UTC+7)
  const now = new Date();
  const bangkokDateStr = now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
  const bkkDate = new Date(bangkokDateStr);

  const dayOfWeek = bkkDate.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const hour = bkkDate.getHours();
  const minute = bkkDate.getMinutes();
  const timeInMinutes = hour * 60 + minute;

  const bangkokTime = bkkDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

  // 1. US Stocks / Equities (AAPL, NVDA, TSLA, SPY, etc.)
  if (assetType === 'stock') {
    // US Markets trade Monday - Friday 21:30 - 04:00 Bangkok Time (Regular Trading Hours)
    // Saturday & Sunday are closed
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return {
        isOpen: false,
        sessionName: 'US Market Closed (Weekend)',
        reason: 'ตลาดหุ้นสหรัฐฯ ปิดทำการช่วงวันหยุดสุดสัปดาห์ (เสาร์-อาทิตย์)',
        bangkokTime,
      };
    }

    // US Trading hours in Bangkok: 21:30 to 04:00 (next day)
    const isRegularTradingHours = timeInMinutes >= (21 * 60 + 30) || timeInMinutes < (4 * 60);

    if (isRegularTradingHours) {
      return {
        isOpen: true,
        sessionName: 'US Regular Trading Session',
        reason: 'ตลาดหุ้นสหรัฐฯ เปิดทำการ (21:30 - 04:00 น.)',
        bangkokTime,
      };
    }

    return {
      isOpen: false,
      sessionName: 'US Pre/Post Market (Closed)',
      reason: 'อยู่นอกเวลาทำการตลาดหุ้นสหรัฐฯ (เปิด 21:30 - 04:00 น.)',
      bangkokTime,
    };
  }

  // 2. Forex & Commodities / Gold (XAUUSD, EURUSD, USDJPY, GBPUSD, etc.)
  // Forex opens Monday 05:00 Bangkok Time and closes Saturday 05:00 Bangkok Time
  // Saturday 05:00 to Monday 05:00 is Weekend Market Closure
  if (dayOfWeek === 6) {
    // Saturday: Open only before 05:00 AM Bangkok Time
    if (hour >= 5) {
      return {
        isOpen: false,
        sessionName: 'Weekend Market Closed',
        reason: 'ตลาด Forex & ทองคำ ปิดทำการช่วงวันหยุดสุดสัปดาห์ (เปิดอีกครั้งวันจันทร์ 05:00 น.)',
        bangkokTime,
      };
    }
    return {
      isOpen: true,
      sessionName: 'Friday Closing Session',
      reason: 'ช่วงท้ายตลาดวันศุกร์ (ก่อนปิด 05:00 น.)',
      bangkokTime,
    };
  }

  if (dayOfWeek === 0) {
    // Sunday: Entirely Closed
    return {
      isOpen: false,
      sessionName: 'Weekend Market Closed',
      reason: 'ตลาด Forex & ทองคำ ปิดทำการวันอาทิตย์ (เปิดอีกครั้งวันจันทร์ 05:00 น.)',
      bangkokTime,
    };
  }

  if (dayOfWeek === 1) {
    // Monday: Opens at 05:00 AM Bangkok Time
    if (hour < 5) {
      return {
        isOpen: false,
        sessionName: 'Pre-Market Monday',
        reason: 'ตลาดกำลังเตรียมเปิดทำการ (เปิด 05:00 น.)',
        bangkokTime,
      };
    }
  }

  // Monday 05:00 AM through Friday midnight -> Open 24 Hours
  let session = 'Active Global Trading Session';
  if (hour >= 5 && hour < 14) session = 'Tokyo / Asian Session 🇯🇵';
  else if (hour >= 14 && hour < 20) session = 'London / European Session 🇬🇧';
  else session = 'New York / US Session 🇺🇸';

  return {
    isOpen: true,
    sessionName: session,
    reason: 'ตลาด Forex & สินค้าโภคภัณฑ์ เปิดทำการปกติ 24 ชม.',
    bangkokTime,
  };
}
