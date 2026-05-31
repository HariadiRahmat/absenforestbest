import type { FriendlyError } from '../components/ui/Alert';

export function parseAuthAlertMessage(raw: string | null | undefined): FriendlyError {
  if (!raw?.trim()) {
    return {
      title: 'Gagal masuk',
      message: 'Terjadi kesalahan saat login. Silakan coba lagi.',
      tips: ['Belum punya akun? Tekan Daftar lalu tunggu Pembina menyetujui.'],
    };
  }

  const msg = raw.toLowerCase();

  if (
    msg.includes('firestore')
    || msg.includes('permission')
    || msg.includes('rules')
    || msg.includes('publish')
    || msg.includes('database')
  ) {
    return {
      title: 'Akun belum bisa diakses',
      message: 'Pendaftaran mungkin belum disetujui Pembina, atau sistem sedang diperbarui.',
      tips: [
        'Pastikan Pembina sudah menyetujui email Anda.',
        'Tutup app, buka lagi, lalu tekan Perbarui Status jika muncul.',
        'Masih gagal? Hubungi Pembina ForestBest.',
      ],
    };
  }

  if (msg.includes('missing initial state') || msg.includes('sesi login')) {
    return {
      title: 'Login terputus',
      message: 'Sesi Google terputus di browser Anda.',
      tips: [
        'Tutup tab Google yang masih terbuka.',
        'Tekan Masuk dengan Google sekali lagi.',
      ],
    };
  }

  if (msg.includes('popup') || msg.includes('pop-up')) {
    return {
      title: 'Popup diblokir',
      message: 'Browser memblokir jendela login Google.',
      tips: [
        'Izinkan popup untuk situs ini di pengaturan browser.',
        'Coba Chrome atau Safari terbaru.',
      ],
    };
  }

  if (msg.includes('network') || msg.includes('internet') || msg.includes('koneksi')) {
    return {
      title: 'Koneksi bermasalah',
      message: raw,
      tips: ['Periksa Wi‑Fi atau data seluler.', 'Coba lagi dalam beberapa saat.'],
    };
  }

  if (msg.includes('dibatalkan') || msg.includes('cancelled')) {
    return {
      title: 'Login dibatalkan',
      message: 'Proses login Google belum selesai.',
      tips: ['Tekan Masuk dengan Google dan pilih akun Anda.'],
    };
  }

  if (msg.includes('unauthorized-domain') || msg.includes('domain belum')) {
    return {
      title: 'Domain tidak dikenali',
      message: 'Situs ini belum terdaftar di sistem autentikasi.',
      tips: ['Hubungi admin teknis ForestBest.'],
    };
  }

  if (msg.includes('belum terdaftar') || msg.includes('unregistered')) {
    return {
      title: 'Email belum terdaftar',
      message: raw,
      tips: [
        'Tekan Daftar di halaman login jika belum pernah mendaftar.',
        'Sudah daftar? Tunggu Pembina menyetujui pendaftaran Anda.',
      ],
    };
  }

  return {
    title: 'Gagal masuk',
    message: raw,
    tips: [
      'Belum punya akun? Tekan Daftar lalu tunggu Pembina.',
      'Sudah disetujui? Login dengan email Google yang sama.',
    ],
  };
}

export function parseFormAlertMessage(raw: string | null | undefined, fallbackTitle = 'Perhatian'): FriendlyError {
  if (!raw?.trim()) {
    return { title: fallbackTitle, message: 'Terjadi kesalahan. Silakan coba lagi.' };
  }

  const msg = raw.toLowerCase();

  if (msg.includes('permission') || msg.includes('firestore') || msg.includes('publish')) {
    return {
      title: 'Tidak bisa menyimpan',
      message: 'Akses database ditolak. Hubungi Pembina jika masalah berlanjut.',
      tips: ['Pastikan koneksi internet stabil.', 'Coba lagi dalam beberapa menit.'],
    };
  }

  if (msg.includes('wajib') || msg.includes('lengkapi')) {
    return {
      title: 'Data belum lengkap',
      message: raw,
      tips: ['Isi semua field yang bertanda wajib sebelum menyimpan.'],
    };
  }

  return { title: fallbackTitle, message: raw };
}
