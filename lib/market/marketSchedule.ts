import { AssetType } from '../types';

export interface MarketStatusResult {
  isOpen: boolean;
  sessionName: string;
  reason: string;
  bangkokTime: string;
  liquidity?: 'LOW' | 'MEDIUM' | 'HIGH';
  spread_warning?: boolean;
}

// ---- US Federal Market Holiday Detection ----

function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  // month: 0-indexed. weekday: 0=Sun, 1=Mon...6=Sat
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d);
    if (date.getMonth() !== month) break;
    if (date.getDay() === weekday) {
      count++;
      if (count === n) return date;
    }
  }
  return new Date(year, month, 1);
}

function lastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  for (let d = 31; d >= 1; d--) {
    const date = new Date(year, month, d);
    if (date.getMonth() !== month) continue;
    if (date.getDay() === weekday) return date;
  }
  return new Date(year, month, 1);
}

// Computus algorithm for Easter Sunday
function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

function isUSFederalHoliday(date: Date): boolean {
  // Convert to US/Eastern for holiday calculation (approximate using UTC-5)
  const etDate = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  const y = etDate.getUTCFullYear();
  const m = etDate.getUTCMonth();
  const d = etDate.getUTCDate();
  const dow = etDate.getUTCDay();

  // Helper: check if a holiday (which may shift for Sat/Sun) matches
  function matchesHoliday(hDate: Date): boolean {
    const hm = hDate.getMonth();
    const hd = hDate.getDate();
    const hdow = hDate.getDay();
    if (hdow === 6) {
      // Sat → Friday observed
      const fri = new Date(hDate); fri.setDate(hd - 1);
      return m === fri.getMonth() && d === fri.getDate() && dow === 5;
    } else if (hdow === 0) {
      // Sun → Monday observed
      const mon = new Date(hDate); mon.setDate(hd + 1);
      return m === mon.getMonth() && d === mon.getDate() && dow === 1;
    }
    return m === hm && d === hd;
  }

  const holidays = [
    new Date(y, 0, 1),                              // New Year's Day
    nthWeekdayOfMonth(y, 0, 1, 3),                  // MLK Day (3rd Mon Jan)
    nthWeekdayOfMonth(y, 1, 1, 3),                  // Presidents' Day (3rd Mon Feb)
    new Date(getEaster(y).getTime() - 2 * 86400000), // Good Friday (2 days before Easter)
    lastWeekdayOfMonth(y, 4, 1),                     // Memorial Day (last Mon May)
    new Date(y, 5, 19),                              // Juneteenth
    new Date(y, 6, 4),                               // Independence Day
    nthWeekdayOfMonth(y, 8, 1, 1),                  // Labor Day (1st Mon Sep)
    nthWeekdayOfMonth(y, 10, 4, 4),                 // Thanksgiving (4th Thu Nov)
    new Date(y, 11, 25),                             // Christmas Day
  ];

  return holidays.some(matchesHoliday);
}

/**
 * Get accurate live market open/close status in Asia/Bangkok time
 */
export function getMarketStatus(assetType: AssetType = 'forex', ticker?: string): MarketStatusResult {
  const now = new Date();
  const bangkokDateStr = now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' });
  const bkkDate = new Date(bangkokDateStr);

  const dayOfWeek = bkkDate.getDay();
  const hour = bkkDate.getHours();
  const minute = bkkDate.getMinutes();
  const timeInMinutes = hour * 60 + minute;
  const bangkokTime = bkkDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';

  // 1. US Stocks / Equities
  if (assetType === 'stock' || assetType === 'index') {
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { isOpen: false, sessionName: 'US Market Closed (Weekend)', reason: 'ตลาดหุ้นสหรัฐฯ ปิดทำการช่วงวันหยุดสุดสัปดาห์ (เสาร์-อาทิตย์)', bangkokTime };
    }
    // Check Federal Holidays
    if (isUSFederalHoliday(now)) {
      return { isOpen: false, sessionName: 'US Market Closed (Federal Holiday)', reason: 'ตลาดหุ้นสหรัฐฯ ปิดทำการเนื่องจากวันหยุดราชการ (US Federal Holiday)', bangkokTime };
    }
    const isRegularTradingHours = timeInMinutes >= (21 * 60 + 30) || timeInMinutes < (4 * 60);
    if (isRegularTradingHours) {
      return { isOpen: true, sessionName: 'US Regular Trading Session', reason: 'ตลาดหุ้นสหรัฐฯ เปิดทำการ (21:30 - 04:00 น.)', bangkokTime };
    }
    return { isOpen: false, sessionName: 'US Pre/Post Market (Closed)', reason: 'อยู่นอกเวลาทำการตลาดหุ้นสหรัฐฯ (เปิด 21:30 - 04:00 น.)', bangkokTime };
  }

  // 2. Forex & Commodities / Gold
  if (dayOfWeek === 6) {
    if (hour >= 5) {
      return { isOpen: false, sessionName: 'Weekend Market Closed', reason: 'ตลาด Forex & ทองคำ ปิดทำการช่วงวันหยุดสุดสัปดาห์ (เปิดอีกครั้งวันจันทร์ 05:00 น.)', bangkokTime };
    }
    return { isOpen: true, sessionName: 'Friday Closing Session', reason: 'ช่วงท้ายตลาดวันศุกร์ (ก่อนปิด 05:00 น.)', bangkokTime };
  }

  if (dayOfWeek === 0) {
    return { isOpen: false, sessionName: 'Weekend Market Closed', reason: 'ตลาด Forex & ทองคำ ปิดทำการวันอาทิตย์ (เปิดอีกครั้งวันจันทร์ 05:00 น.)', bangkokTime };
  }

  if (dayOfWeek === 1 && hour < 5) {
    return { isOpen: false, sessionName: 'Pre-Market Monday', reason: 'ตลาดกำลังเตรียมเปิดทำการ (เปิด 05:00 น.)', bangkokTime };
  }

  let session = 'Active Global Trading Session';
  let liquidity: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH';
  let spreadWarning = false;

  if (hour >= 4 && hour < 8) {
    session = 'Rollover / Early Asian ⚠️';
    liquidity = 'LOW';
    spreadWarning = true;
  } else if (hour >= 8 && hour < 14) {
    session = 'Tokyo / Asian Session 🇯🇵';
    liquidity = 'LOW';
    spreadWarning = true;
  } else if (hour >= 14 && hour < 19) {
    session = 'London / European Session 🇬🇧';
    liquidity = 'MEDIUM';
    spreadWarning = false;
  } else if (hour >= 19 && hour < 23) {
    session = 'London / NY Overlap 🇺🇸🇬🇧 (Best Liquidity)';
    liquidity = 'HIGH';
    spreadWarning = false;
  } else {
    session = 'New York / US Session 🇺🇸';
    liquidity = 'MEDIUM';
    spreadWarning = false;
  }

  return { 
    isOpen: true, 
    sessionName: session, 
    reason: 'ตลาด Forex & สินค้าโภคภัณฑ์ เปิดทำการปกติ 24 ชม.', 
    bangkokTime,
    liquidity,
    spread_warning: spreadWarning
  };
}
