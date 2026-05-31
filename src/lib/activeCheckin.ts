import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

/** Verifikasi token terhadap settings/active_checkin (readable oleh anggota). */
export async function verifyActiveCheckin(tanggal: string, qrToken: string): Promise<void> {
  const snap = await getDoc(doc(db, 'settings', 'active_checkin'));
  if (!snap.exists()) {
    throw new Error(
      'Check-in belum aktif. Pembina buka dashboard Pembina dulu untuk mengaktifkan QR hari ini.'
    );
  }

  const data = snap.data();
  if (data.date !== tanggal) {
    throw new Error(
      `QR aktif untuk tanggal ${data.date}, bukan ${tanggal}. Scan QR hari ini dari Pembina.`
    );
  }
  if (data.token !== qrToken) {
    throw new Error(
      'Token QR tidak valid. Scan QR terbaru dari Pembina (atau ketik token manual yang tampil di layar).'
    );
  }
  if (data.active !== true) {
    throw new Error('Check-in sudah ditutup. Hubungi Pembina.');
  }
}
