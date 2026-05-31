import { FirebaseError } from 'firebase/app';

export function isMissingRedirectStateError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return error.message.includes('missing initial state');
}

export function isMobileOrInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const isInApp = /(FBAN|FBAV|Instagram|Line|Twitter|WhatsApp|TikTok|WebView)/i.test(ua);
  return isMobile || isInApp;
}

export function getGoogleSignInErrorMessage(error: unknown): string {
  if (isMissingRedirectStateError(error)) {
    return 'Sesi login Google terputus. Tutup tab Google jika masih terbuka, lalu tekan Masuk dengan Google sekali lagi.';
  }

  const code = error instanceof FirebaseError ? error.code : '';
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (message.includes('something went wrong')) {
    return 'Google tidak bisa menyelesaikan login. Coba buka di Chrome/Safari (bukan browser dalam aplikasi), atau tutup popup lalu tekan Masuk lagi.';
  }

  switch (code) {
    case 'auth/unauthorized-domain':
      return 'Domain belum diizinkan di Firebase. Tambahkan absenforestbest.vercel.app di Authentication → Settings → Authorized domains.';
    case 'auth/operation-not-allowed':
      return 'Login Google belum diaktifkan. Aktifkan provider Google di Firebase Console → Authentication → Sign-in method.';
    case 'auth/popup-blocked':
      return 'Pop-up diblokir browser. Coba lagi — sistem akan redirect ke halaman Google.';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Login dibatalkan. Silakan coba lagi dan selesaikan proses di Google.';
    case 'auth/network-request-failed':
      return 'Koneksi internet bermasalah. Periksa jaringan lalu coba lagi.';
    case 'auth/account-exists-with-different-credential':
      return 'Email ini sudah terdaftar dengan metode login lain.';
    case 'auth/internal-error':
      return 'Login Google gagal sementara. Tutup tab Google yang masih terbuka, lalu coba lagi.';
    default:
      if (error instanceof Error && error.message) {
        return error.message;
      }
      return 'Login Google gagal. Tutup tab Google yang masih terbuka, lalu coba lagi.';
  }
}

export function shouldUseRedirectSignIn(): boolean {
  // Popup Google sering menampilkan "Something went wrong" di HP & browser in-app.
  return isMobileOrInAppBrowser();
}

export function shouldFallbackToRedirect(error: unknown): boolean {
  if (!(error instanceof FirebaseError)) return false;
  return [
    'auth/popup-blocked',
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request',
    'auth/web-storage-unsupported',
    'auth/internal-error',
  ].includes(error.code);
}

export function getEmailAuthErrorMessage(error: unknown): string {
  const code = error instanceof FirebaseError ? error.code : '';
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  switch (code) {
    case 'auth/invalid-email':
      return 'Format email tidak valid.';
    case 'auth/user-disabled':
      return 'Akun ini dinonaktifkan. Hubungi Pembina.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email atau password salah.';
    case 'auth/email-already-in-use':
      return 'Email sudah terdaftar. Coba login atau gunakan email lain.';
    case 'auth/weak-password':
      return 'Password terlalu lemah. Gunakan kombinasi huruf, angka, dan simbol.';
    case 'auth/operation-not-allowed':
      return 'Login email/password belum diaktifkan di Firebase. Aktifkan Email/Password di Authentication → Sign-in method.';
    case 'auth/too-many-requests':
      return 'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.';
    case 'auth/network-request-failed':
      return 'Koneksi internet bermasalah. Periksa jaringan lalu coba lagi.';
    case 'auth/account-exists-with-different-credential':
      return 'Email ini sudah terdaftar dengan metode login lain (misalnya Google).';
    default:
      if (message.includes('permission-denied')) {
        return 'Akses ditolak. Publish firestore.rules terbaru di Firebase Console.';
      }
      if (error instanceof Error && error.message) return error.message;
      return 'Autentikasi gagal. Periksa data Anda lalu coba lagi.';
  }
}
