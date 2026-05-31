import { getTodayStr } from './dateUtils';

export interface ParsedQrPayload {
  token: string;
  date: string;
}

/** Parse isi QR: plain token atau JSON {"v":1,"d":"YYYY-MM-DD","t":"TOKEN"} */
export function parseQrScan(raw: string): ParsedQrPayload {
  const trimmed = raw.trim();

  if (trimmed.startsWith('{')) {
    try {
      const json = JSON.parse(trimmed) as { d?: string; t?: string; token?: string; date?: string };
      const token = sanitizeToken(String(json.t ?? json.token ?? ''));
      const date = String(json.d ?? json.date ?? getTodayStr()).trim();
      if (token) return { token, date };
    } catch {
      /* fallback below */
    }
  }

  return { token: sanitizeToken(trimmed), date: getTodayStr() };
}

/** Bersihkan token dari karakter liar hasil scan */
export function sanitizeToken(token: string): string {
  return token.trim().replace(/[^\w\-]/g, '');
}

export function buildQrContent(token: string, date: string): string {
  return JSON.stringify({ v: 1, d: date, t: token });
}

export function validateQrForToday(parsed: ParsedQrPayload): string | null {
  const today = getTodayStr();
  if (parsed.date !== today) {
    return `QR Code ini untuk tanggal ${parsed.date}, bukan hari ini (${today}). Minta Pembina tampilkan QR hari ini.`;
  }
  if (!parsed.token) {
    return 'Token QR kosong. Scan ulang atau ketik token manual dari layar Pembina.';
  }
  if (parsed.token.length > 100) {
    return 'Token QR terlalu panjang. Pastikan scan ke QR terbaru dari Pembina.';
  }
  return null;
}
