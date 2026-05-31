import { FirebaseError } from 'firebase/app';

export function getGoogleSignInErrorMessage(error: unknown): string {
  const code = error instanceof FirebaseError ? error.code : '';

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
    default:
      if (error instanceof Error && error.message) {
        return error.message;
      }
      return 'Gagal masuk via Google. Coba lagi atau gunakan browser Chrome/Safari terbaru.';
  }
}

export function shouldUseRedirectSignIn(): boolean {
  if (typeof window === 'undefined') return false;
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const narrow = window.innerWidth < 768;
  const standalone = window.matchMedia('(display-mode: standalone)').matches;
  return mobile || narrow || standalone;
}

export function shouldFallbackToRedirect(error: unknown): boolean {
  if (!(error instanceof FirebaseError)) return false;
  return [
    'auth/popup-blocked',
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request',
    'auth/web-storage-unsupported',
  ].includes(error.code);
}
