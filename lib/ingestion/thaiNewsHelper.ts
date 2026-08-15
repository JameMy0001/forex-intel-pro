import { NewsArticle } from '../types';

/**
 * Intelligent Thai translation and summarization dictionary for financial market terminology
 */
export function enrichArticleWithThaiSummary(article: NewsArticle): NewsArticle {
  const headline = article.headline || '';
  const summary = article.summary || '';
  const text = `${headline} ${summary}`.toLowerCase();

  let thaiHeadline = headline;
  let thaiSummary = summary;

  // Domain-specific translations & summaries
  if (text.includes('fed') || text.includes('federal reserve') || text.includes('powell') || text.includes('rate cut') || text.includes('rate hike') || text.includes('inflation') || text.includes('cpi')) {
    if (text.includes('rate cut') || text.includes('cooling') || text.includes('easing')) {
      thaiHeadline = `🇺🇸 ธนาคารกลางสหรัฐฯ (Fed) ส่งสัญญาณแนวโน้มปรับลดอัตราดอกเบี้ยหลังเงินเฟ้อชะลอตัว`;
      thaiSummary = `ตลาดคาดการณ์สภาพคล่องหนุนสินทรัพย์เสี่ยง ส่งผลให้ดอลลาร์สหรัฐฯ มีแนวโน้มอ่อนค่าลง`;
    } else if (text.includes('hike') || text.includes('sticky') || text.includes('high')) {
      thaiHeadline = `🇺🇸 Fed ส่งสัญญาณตรึงดอกเบี้ยสูงต่อเนื่องเพื่อควบคุมอัตราเงินเฟ้อ`;
      thaiSummary = `อัตราผลตอบแทนพันธบัตรสหรัฐฯ ปรับตัวขึ้น ส่งแรงหนุนให้ค่าเงินดอลลาร์สหรัฐฯ แข็งค่ากดดันคู่เงินหลัก`;
    } else {
      thaiHeadline = `🇺🇸 รายงานทิศทางนโยบายการเงินของ Fed และตัวเลขเงินเฟ้อสหรัฐฯ`;
      thaiSummary = `นักลงทุนจับตาสัญญาณดอกเบี้ยจากประธานเฟด ซึ่งจะส่งผลโดยตรงต่อความผันผวนของค่าเงินดอลลาร์และทองคำ`;
    }
  } else if (text.includes('bank of japan') || text.includes('boj') || text.includes('yen') || text.includes('jpy') || article.ticker === 'USDJPY') {
    if (text.includes('intervention') || text.includes('warning') || text.includes('strengthen')) {
      thaiHeadline = `🇯🇵 ทางการญี่ปุ่นจับตาความผันผวนของค่าเงินเยน พร้อมพิจารณามาตรการแทรกแซง`;
      thaiSummary = `ความกังวลการเข้าแทรกแซงจาก BoJ อาจทำให้คู่เงิน USD/JPY เกิดแรงเทขายรวดเร็วบริเวณแนวต้าน`;
    } else if (text.includes('yield') || text.includes('rate') || text.includes('hike')) {
      thaiHeadline = `🇯🇵 ธนาคารกลางญี่ปุ่น (BOJ) พิจารณาปรับกรอบอัตราดอกเบี้ยและ Yield Curve`;
      thaiSummary = `ส่งผลให้ค่าเงินเยนเคลื่อนไหวผันผวน เทรดเดอร์ควรจับตาแนวรับสำคัญอย่างใกล้ชิด`;
    } else {
      thaiHeadline = `🇯🇵 การเคลื่อนไหวของค่าเงินเยนและการปรับสมดุลเงินทุนในตลาดญี่ปุ่น`;
      thaiSummary = `กระแสเงินทุนและส่วนต่างอัตราดอกเบี้ยระหว่างสหรัฐฯ-ญี่ปุ่นยังคงเป็นปัจจัยหลักในการขับเคลื่อนคู่เงิน USD/JPY`;
    }
  } else if (text.includes('gold') || text.includes('xau') || text.includes('bullion') || article.ticker === 'XAUUSD') {
    if (text.includes('high') || text.includes('rally') || text.includes('surge') || text.includes('gain')) {
      thaiHeadline = `✨ ราคาทองคำ (XAU/USD) ปรับตัวขึ้นต่อเนื่อง ขานรับแรงซื้อสินทรัพย์ปลอดภัยและธนาคารกลาง`;
      thaiSummary = `ความต้องการถือครองทองคำเพื่อป้องกันความเสี่ยงหนุนให้ราคาแตะระดับสูง ทรงตัวเหนือแนวรับสำคัญ`;
    } else {
      thaiHeadline = `✨ ทิศทางราคาทองคำโลก (XAU/USD) และปัจจัยขับเคลื่อนด้านภูมิรัฐศาสตร์`;
      thaiSummary = `ราคาทองคำเคลื่อนไหวตามทิศทางดอลลาร์สหรัฐฯ และ Bond Yields โดยยังมีแรงซื้อสถาบันรอรับเมื่อย่อตัว`;
    }
  } else if (text.includes('nvidia') || text.includes('nvda') || text.includes('ai') || text.includes('chip') || text.includes('blackwell')) {
    thaiHeadline = `🟢 หุ้นกลุ่มชิปและ AI (NVIDIA) ได้รับแรงหนุนจากความต้องการศูนย์ข้อมูลทั่วโลก`;
    thaiSummary = `การลงทุนด้านโครงสร้างพื้นฐาน AI ยังคงแข็งแกร่ง หนุนความเชื่อมั่นและแนวโน้มการเติบโตของรายได้`;
  } else if (text.includes('apple') || text.includes('aapl')) {
    thaiHeadline = `🍎 ความต้องการผลิตภัณฑ์ Apple และการเปิดตัว Apple Intelligence หนุนยอดขาย`;
    thaiSummary = `ยอดสั่งซื้อและรอบการอัปเกรดอุปกรณ์ระดับพรีเมียมช่วยพยุงราคาหุ้นในระดับสูง`;
  } else if (text.includes('tesla') || text.includes('tsla') || text.includes('ev') || text.includes('robotaxi')) {
    thaiHeadline = `⚡ Tesla เดินหน้าขยายโครงการระบบขับขี่อัตโนมัติ Full Self-Driving และ Robotaxi`;
    thaiSummary = `ความคืบหน้าด้านเทคโนโลยีและใบอนุญาตช่วยเพิ่มมุมมองเชิงบวกต่อแผนธุรกิจระยะยาว`;
  } else if (text.includes('oil') || text.includes('crude') || text.includes('energy')) {
    thaiHeadline = `🛢️ ราคาน้ำมันดิบโลกตอบรับสถานการณ์ในตะวันออกกลางและความต้องการพลังงาน`;
    thaiSummary = `ความเสี่ยงด้านอุปทานยังคงเป็นปัจจัยหนุนราคา ส่งผลกระทบต่อต้นทุนเงินเฟ้อในตลาดโลก`;
  } else if (text.includes('euro') || text.includes('ecb') || text.includes('eurusd')) {
    thaiHeadline = `🇪🇺 ธนาคารกลางยุโรป (ECB) ประเมินทิศทางเศรษฐกิจและอัตราเงินเฟ้อในยูโรโซน`;
    thaiSummary = `ทิศทางนโยบายการเงินแบบค่อยเป็นค่อยไปช่วยพยุงเสถียรภาพของคู่เงิน EUR/USD`;
  } else if (text.includes('market') || text.includes('s&p') || text.includes('stocks') || text.includes('spy')) {
    if (article.sentiment_score >= 0.15) {
      thaiHeadline = `📈 ตลาดหุ้นปรับตัวขึ้นรับความเชื่อมั่นเชิงบวกและผลประกอบการบริษัท`;
      thaiSummary = `แรงซื้อกระจายตัวในกลุ่มเทคโนโลยีและดัชนีหลัก สะท้อนความเชื่อมั่นของนักลงทุน`;
    } else if (article.sentiment_score <= -0.15) {
      thaiHeadline = `📉 ตลาดการเงินเผชิญแรงขายทำกำไรท่ามกลางความไม่แน่นอนของตัวเลขเศรษฐกิจ`;
      thaiSummary = `นักลงทุนปรับลดความเสี่ยง ส่งผลให้เกิดแรงกดดันระยะสั้นต่อดัชนีและคู่เงิน`;
    } else {
      thaiHeadline = `⚖️ ตลาดการเงินเคลื่อนไหวในกรอบสะสมกำลัง รอปัจจัยชี้นำใหม่`;
      thaiSummary = `การซื้อขายเป็นไปอย่างระมัดระวังเพื่อรอตัวเลขเศรษฐกิจสำคัญที่จะประกาศในสัปดาห์นี้`;
    }
  }

  return {
    ...article,
    thai_headline: thaiHeadline,
    thai_summary: thaiSummary,
  };
}
