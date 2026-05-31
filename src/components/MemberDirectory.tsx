/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Edit2, Plus, Search, Trash2, Users } from 'lucide-react';
import { UserProfile, UserRole, UserStatus } from '../types';

export interface MemberDirectoryProps {
  role: UserRole;
  members: UserProfile[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  filterRegu: string;
  onFilterReguChange: (value: string) => void;
  filterKelas: string;
  onFilterKelasChange: (value: string) => void;
  uniqueRegus: string[];
  uniqueClasses: string[];
  onAdd: () => void;
  onEdit: (member: UserProfile) => void;
  onDelete: (userId: string) => void;
  onToggleStatus: (member: UserProfile) => void;
}

const copy = {
  [UserRole.ANGGOTA]: {
    title: 'Daftar Anggota Pramuka',
    subtitle: 'Kelola data anggota, regu, dan status keaktifan.',
    searchPlaceholder: 'Cari nama, email, kelas, regu...',
    addLabel: 'Tambah Anggota',
    emptyLabel: 'Belum ada anggota yang cocok dengan pencarian atau filter.',
    showClassSquadFilters: true,
  },
  [UserRole.ADMIN]: {
    title: 'Daftar Pembina',
    subtitle: 'Kelola akun pembina yang mengelola absensi dan QR harian.',
    searchPlaceholder: 'Cari nama atau email pembina...',
    addLabel: 'Tambah Pembina',
    emptyLabel: 'Belum ada pembina yang cocok dengan pencarian.',
    showClassSquadFilters: false,
  },
};

export function MemberDirectory({
  role,
  members,
  loading,
  search,
  onSearchChange,
  filterRegu,
  onFilterReguChange,
  filterKelas,
  onFilterKelasChange,
  uniqueRegus,
  uniqueClasses,
  onAdd,
  onEdit,
  onDelete,
  onToggleStatus,
}: MemberDirectoryProps) {
  const labels = copy[role];

  return (
    <div className="scout-card p-4 sm:p-6">
      <div className="mb-6 pb-4 border-b border-bento-border">
        <h3 className="text-base font-bold text-bento-text">{labels.title}</h3>
        <p className="text-sm text-bento-muted mt-1">{labels.subtitle}</p>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
            <Search className="h-4 w-4 text-bento-muted" />
          </span>
          <input
            type="text"
            className="w-full h-11 pl-10 pr-4 border border-bento-border focus:outline-none focus:ring-2 focus:ring-bento-primary/30 focus:border-bento-primary rounded-2xl text-sm text-bento-text placeholder-bento-muted bg-bento-soft"
            placeholder={labels.searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {labels.showClassSquadFilters && (
            <>
              <select
                className="h-11 w-full sm:flex-1 sm:min-w-0 px-3 border border-bento-border rounded-2xl text-sm font-medium bg-white text-bento-text appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-bento-primary/30"
                value={filterRegu}
                onChange={(e) => onFilterReguChange(e.target.value)}
              >
                <option value="ALL">Semua Regu</option>
                {uniqueRegus.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select
                className="h-11 w-full sm:flex-1 sm:min-w-0 px-3 border border-bento-border rounded-2xl text-sm font-medium bg-white text-bento-text appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-bento-primary/30"
                value={filterKelas}
                onChange={(e) => onFilterKelasChange(e.target.value)}
              >
                <option value="ALL">Semua Kelas</option>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </>
          )}

          <button type="button" onClick={onAdd} className="h-11 w-full sm:w-auto sm:shrink-0 scout-btn-primary text-sm px-5">
            <Plus className="w-4 h-4" />
            {labels.addLabel}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-bento-muted text-sm">
          <div className="w-6 h-6 border-2 border-bento-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Memuat data...
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-bento-muted text-sm">
          <Users className="w-12 h-12 stroke-1 mx-auto mb-2 opacity-40" />
          {labels.emptyLabel}
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {members.map((member) => (
              <MemberCard
                key={member.userId}
                member={member}
                role={role}
                onEdit={onEdit}
                onDelete={onDelete}
                onToggleStatus={onToggleStatus}
              />
            ))}
          </div>

          <div className="hidden md:block overflow-x-auto -mx-2 sm:mx-0">
            <table className="w-full text-left border-collapse min-w-[560px]">
              <thead>
                <tr className="border-b border-bento-border bg-bento-soft text-[10px] font-bold text-bento-muted uppercase tracking-wider">
                  <th className="p-4 rounded-l-2xl">Nama & Email</th>
                  {role === UserRole.ANGGOTA && <th className="p-4">Kelas / Regu</th>}
                  {role === UserRole.ADMIN && <th className="p-4">Unit</th>}
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right rounded-r-2xl">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bento-border text-xs text-bento-text">
                {members.map((member) => (
                  <tr key={member.userId} className="hover:bg-bento-soft/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-bento-text">{member.nama}</div>
                      <div className="font-mono text-[10px] text-bento-muted mt-0.5">{member.email}</div>
                    </td>
                    <td className="p-4">
                      {role === UserRole.ANGGOTA ? (
                        <>
                          <div className="font-semibold">Kelas {member.kelas}</div>
                          <div className="text-bento-muted mt-0.5">Regu {member.regu}</div>
                        </>
                      ) : (
                        <div className="text-bento-muted">
                          {member.kelas} · {member.regu}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <StatusBadge member={member} onToggle={() => onToggleStatus(member)} />
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => onEdit(member)}
                        className="p-1.5 hover:bg-bento-highlight text-bento-primary transition rounded-lg bg-bento-soft border border-bento-border cursor-pointer"
                        title="Ubah"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(member.userId)}
                        className="p-1.5 hover:bg-rose-50 text-rose-700 transition rounded-lg bg-bento-soft border border-bento-border cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ member, onToggle }: { member: UserProfile; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="font-semibold cursor-pointer text-[10px]" title="Klik untuk ubah status">
      {member.status === UserStatus.AKTIF ? (
        <span className="text-lime-800 bg-lime-50 px-2.5 py-1 rounded-full border border-lime-200">Aktif</span>
      ) : (
        <span className="text-bento-muted bg-white px-2.5 py-1 rounded-full border border-bento-border">Nonaktif</span>
      )}
    </button>
  );
}

function MemberCard({
  member,
  role,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  member: UserProfile;
  role: UserRole;
  onEdit: (m: UserProfile) => void;
  onDelete: (userId: string) => void;
  onToggleStatus: (m: UserProfile) => void;
}) {
  return (
    <div className="border border-bento-border rounded-2xl p-4 bg-bento-soft/30">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-bento-text truncate">{member.nama}</p>
          <p className="text-[11px] text-bento-muted font-mono truncate mt-0.5">{member.email}</p>
        </div>
        <StatusBadge member={member} onToggle={() => onToggleStatus(member)} />
      </div>
      <div className="flex flex-wrap gap-2 mt-3 text-xs text-bento-muted">
        {role === UserRole.ANGGOTA ? (
          <>
            <span>Kelas {member.kelas}</span>
            <span>·</span>
            <span>Regu {member.regu}</span>
          </>
        ) : (
          <span>{member.kelas} · {member.regu}</span>
        )}
      </div>
      <div className="flex gap-2 mt-3 pt-3 border-t border-bento-border">
        <button type="button" onClick={() => onEdit(member)} className="flex-1 scout-btn-secondary text-xs py-2">
          <Edit2 className="w-3.5 h-3.5" />
          Ubah
        </button>
        <button type="button" onClick={() => onDelete(member.userId)} className="flex-1 scout-btn-secondary text-xs py-2 text-rose-700 border-rose-100">
          <Trash2 className="w-3.5 h-3.5" />
          Hapus
        </button>
      </div>
    </div>
  );
}
