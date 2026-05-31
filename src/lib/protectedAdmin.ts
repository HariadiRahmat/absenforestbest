/** Email admin utama — tidak boleh dihapus atau diubah rolenya. */
const PROTECTED_ADMIN_EMAIL = (
  import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase()
  || 'hariadirahmat2003@gmail.com'
);

export const PROTECTED_ADMIN_MESSAGE =
  'Akun admin utama tidak dapat dihapus atau diubah rolenya.';

export function getProtectedAdminEmail(): string {
  return PROTECTED_ADMIN_EMAIL;
}

export function isProtectedAdminAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === PROTECTED_ADMIN_EMAIL;
}
