/** Email admin utama — tidak boleh dihapus atau diubah rolenya. */
const PRIMARY_PROTECTED_ADMIN_EMAILS = new Set(
  [
    import.meta.env.VITE_ADMIN_EMAIL?.trim().toLowerCase(),
    'hariadirahmat2003@gmail.com',
    'scoutforestbest@gmail.com',
  ].filter(Boolean) as string[]
);

export const PROTECTED_ADMIN_MESSAGE =
  'Akun admin utama tidak dapat dihapus atau diubah rolenya.';

export function getProtectedAdminEmails(): string[] {
  return [...PRIMARY_PROTECTED_ADMIN_EMAILS];
}

export function isProtectedAdminAccount(email: string | null | undefined): boolean {
  if (!email) return false;
  return PRIMARY_PROTECTED_ADMIN_EMAILS.has(email.trim().toLowerCase());
}
