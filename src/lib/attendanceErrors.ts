import { FirebaseError } from 'firebase/app';

export function getAttendanceErrorMessage(error: unknown): string {
  const code = error instanceof FirebaseError ? error.code : '';
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes('sudah melakukan absensi')) return msg;

  if (code === 'permission-denied' || msg.includes('permission') || msg.includes('Permission')) {
    return [
      'Absensi ditolak Firestore. Kemungkinan penyebab:',
      '• Token QR sudah di-rotate Pembina — scan QR yang sedang tampil sekarang',
      '• Dokumen qr_codes/hari-ini belum ada — Pembina buka dashboard dulu',
      '• Firestore Rules belum publish — hubungi Pembina',
    ].join('\n');
  }

  return msg || 'Gagal mencatat absensi. Coba lagi.';
}
