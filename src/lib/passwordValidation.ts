/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmail(email: string): string | null {
  const value = email.trim();
  if (!value) return 'Email wajib diisi.';
  if (!EMAIL_REGEX.test(value)) return 'Format email tidak valid.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password wajib diisi.';
  if (password.length < 8) return 'Password minimal 8 karakter.';
  if (!/[a-z]/.test(password)) return 'Password harus mengandung huruf kecil.';
  if (!/[A-Z]/.test(password)) return 'Password harus mengandung huruf besar.';
  if (!/\d/.test(password)) return 'Password harus mengandung angka.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password harus mengandung simbol (contoh: !@#$).';
  return null;
}

export function validatePasswordConfirm(password: string, confirm: string): string | null {
  if (!confirm) return 'Konfirmasi password wajib diisi.';
  if (password !== confirm) return 'Konfirmasi password tidak cocok.';
  return null;
}

export const PASSWORD_HINT =
  'Minimal 8 karakter, kombinasi huruf besar, huruf kecil, angka, dan simbol.';
