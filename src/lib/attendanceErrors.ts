import { FirebaseError } from 'firebase/app';
import type { FriendlyError } from '../components/ui/Alert';

export function parseAttendanceError(error: unknown): FriendlyError {
  const code = error instanceof FirebaseError ? error.code : '';
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes('sudah melakukan absensi')) {
    return {
      title: 'Sudah absen hari ini',
      message: 'Kehadiran Anda untuk tanggal ini sudah tercatat. Tidak perlu scan ulang.',
    };
  }

  if (msg.includes('Check-in belum aktif') || msg.includes('belum ada')) {
    return {
      title: 'Absensi belum dibuka',
      message: 'Pembina belum mengaktifkan QR hari ini.',
      tips: [
        'Minta Pembina membuka dashboard dan menampilkan QR harian.',
        'Pastikan QR yang discan adalah yang tampil di layar Pembina saat ini.',
      ],
    };
  }

  if (msg.includes('Token QR tidak valid') || msg.includes('Token tidak cocok')) {
    return {
      title: 'Token QR tidak cocok',
      message: 'Kode yang Anda masukkan berbeda dengan QR aktif hari ini.',
      tips: [
        'Scan ulang QR terbaru dari layar Pembina.',
        'Atau ketik token manual persis seperti yang tertera di dashboard Pembina.',
      ],
    };
  }

  if (msg.includes('QR aktif untuk tanggal') || msg.includes('bukan hari ini')) {
    return {
      title: 'QR untuk tanggal lain',
      message: msg,
      tips: ['Minta Pembina menampilkan QR untuk hari ini.'],
    };
  }

  if (msg.includes('Check-in sudah ditutup')) {
    return {
      title: 'Absensi ditutup',
      message: 'Sesi check-in hari ini sudah tidak aktif.',
      tips: ['Hubungi Pembina untuk membuka kembali absensi.'],
    };
  }

  if (code === 'permission-denied' || msg.includes('permission') || msg.includes('Permission')) {
    return {
      title: 'Absensi belum bisa diproses',
      message: 'Sistem menolak permintaan absensi. Ini biasanya masalah konfigurasi, bukan kesalahan Anda.',
      tips: [
        'Pastikan QR yang discan adalah yang terbaru dari Pembina.',
        'Minta Pembina membuka dashboard sekali agar QR hari ini aktif.',
        'Jika masih gagal, hubungi Pembina — Firestore Rules mungkin perlu di-publish ulang.',
      ],
    };
  }

  if (msg.includes('Token tidak boleh kosong') || msg.includes('Token terlalu panjang')) {
    return {
      title: 'Token tidak valid',
      message: msg,
    };
  }

  if (msg.includes('GPS wajib aktif') || msg.includes('m dari')) {
    return {
      title: 'Di luar area latihan',
      message: msg,
      tips: [
        'Pastikan izin lokasi/GPS aktif di browser.',
        'Dekati titik latihan yang ditentukan Pembina.',
        'Hubungi Pembina jika Anda sudah berada di lokasi yang benar.',
      ],
    };
  }

  if (msg.includes('GPS') || msg.includes('Lokasi')) {
    return {
      title: 'Akses lokasi diperlukan',
      message: msg,
      tips: ['Aktifkan izin lokasi di pengaturan browser, lalu muat ulang halaman.'],
    };
  }

  return {
    title: 'Gagal mencatat absensi',
    message: msg || 'Terjadi kesalahan tak terduga. Silakan coba lagi dalam beberapa saat.',
    tips: ['Periksa koneksi internet Anda.', 'Jika masalah berlanjut, hubungi Pembina.'],
  };
}

/** @deprecated gunakan parseAttendanceError */
export function getAttendanceErrorMessage(error: unknown): string {
  const parsed = parseAttendanceError(error);
  const parts = [parsed.title, parsed.message, ...(parsed.tips ?? [])].filter(Boolean);
  return parts.join('\n');
}
