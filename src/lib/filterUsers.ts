import { UserProfile, UserRole } from '../types';

export function filterUsersByRole(
  users: UserProfile[],
  role: UserRole,
  search: string,
  reguFilter: string,
  kelasFilter: string,
  applyClassSquadFilters: boolean
) {
  const q = search.toLowerCase();
  return users.filter((member) => {
    if (member.role !== role) return false;

    const nama = (member.nama ?? '').toLowerCase();
    const email = (member.email ?? '').toLowerCase();
    const kelas = (member.kelas ?? '').toLowerCase();
    const regu = (member.regu ?? '').toLowerCase();

    const matchesSearch =
      nama.includes(q) || email.includes(q) || kelas.includes(q) || regu.includes(q);

    if (!applyClassSquadFilters) return matchesSearch;

    const matchesRegu =
      reguFilter === 'ALL' || (member.regu ?? '').toUpperCase() === reguFilter.toUpperCase();
    const matchesKelas =
      kelasFilter === 'ALL' || (member.kelas ?? '').toUpperCase() === kelasFilter.toUpperCase();

    return matchesSearch && matchesRegu && matchesKelas;
  });
}
