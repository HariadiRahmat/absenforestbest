/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Edit2, Plus, Search, Trash2, Users, CheckCircle2, Clock, Eye } from 'lucide-react';
import { UserProfile, UserRole, UserStatus } from '../types';
import { isPurnaProfileComplete } from '../lib/purnaProfile';
import { isPreRegisteredUserId } from '../lib/purnaDirectory';

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
  compact?: boolean;
  onView?: (member: UserProfile) => void;
}

const copy = {
  [UserRole.ANGGOTA]: {
    title: 'Daftar Anggota',
    subtitle: 'Kelola data anggota, regu, dan status keaktifan.',
    searchPlaceholder: 'Cari nama, email, kelas...',
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
  [UserRole.PURNA]: {
    title: 'Daftar Purna',
    subtitle: 'Purna disetujui & terdaftar — termasuk yang belum login.',
    searchPlaceholder: 'Cari nama atau email purna...',
    addLabel: 'Tambah',
    emptyLabel: 'Belum ada purna terdaftar.',
    showClassSquadFilters: false,
  },
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

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
  compact = false,
  onView,
}: MemberDirectoryProps) {
  const labels = copy[role];
  const cardClass = compact ? 'scout-card p-3 sm:p-4' : 'scout-card p-4 sm:p-6';
  const headGap = compact ? 'mb-3' : 'mb-5';
  const emptyPy = compact ? 'py-8' : 'py-14';

  return (
    <div className={cardClass}>
      <div className={`scout-section-head ${compact ? '!items-center' : ''}`}>
        <div className="min-w-0">
          <h3 className={`font-bold text-bento-text ${compact ? 'text-sm' : 'text-base'}`}>{labels.title}</h3>
          {!compact && (
            <p className="text-xs sm:text-sm text-bento-muted mt-0.5 leading-relaxed">{labels.subtitle}</p>
          )}
        </div>
        {!loading && members.length > 0 && (
          <span className="scout-count-badge">{members.length}</span>
        )}
      </div>

      <div className={`flex flex-col gap-2 ${headGap} ${compact ? 'sm:flex-row sm:items-center' : ''}`}>
        <div className={`relative w-full ${compact ? 'sm:flex-1' : ''}`}>
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className={`text-bento-muted ${compact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
          </span>
          <input
            type="text"
            className={`scout-input ${compact ? 'h-9 text-xs' : ''}`}
            placeholder={labels.searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {labels.showClassSquadFilters ? (
          <div className="grid grid-cols-2 gap-2">
            <select
              className="scout-select"
              value={filterRegu}
              onChange={(e) => onFilterReguChange(e.target.value)}
            >
              <option value="ALL">Semua Regu</option>
              {uniqueRegus.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <select
              className="scout-select"
              value={filterKelas}
              onChange={(e) => onFilterKelasChange(e.target.value)}
            >
              <option value="ALL">Semua Kelas</option>
              {uniqueClasses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onAdd}
          className={`scout-btn-primary text-sm ${compact ? 'h-9 px-4 shrink-0' : 'h-11 w-full'}`}
        >
          <Plus className="w-4 h-4" />
          {labels.addLabel}
        </button>
      </div>

      {loading ? (
        <div className={`text-center text-bento-muted text-sm ${emptyPy}`}>
          <div className="w-5 h-5 border-2 border-bento-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Memuat data...
        </div>
      ) : members.length === 0 ? (
        <div className={`text-center text-bento-muted text-sm px-4 ${emptyPy}`}>
          <Users className={`stroke-1 mx-auto mb-2 opacity-30 ${compact ? 'w-8 h-8' : 'w-10 h-10'}`} />
          <p className="leading-relaxed text-xs">{labels.emptyLabel}</p>
        </div>
      ) : compact ? (
        <div className="divide-y divide-bento-border border border-bento-border rounded-xl overflow-hidden">
          {members.map((member) => (
            <CompactPurnaRow
              key={member.userId}
              member={member}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleStatus={onToggleStatus}
            />
          ))}
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-2.5">
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
                  {role === UserRole.PURNA && <th className="p-4">Profil</th>}
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
                      ) : role === UserRole.PURNA ? (
                        <PurnaProfileBadge member={member} />
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
                      {onView && role === UserRole.PURNA && (
                        <button
                          type="button"
                          onClick={() => onView(member)}
                          className="p-1.5 hover:bg-bento-soft text-bento-muted transition rounded-lg bg-white border border-bento-border cursor-pointer"
                          title="Lihat biodata"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
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
  const avatarBg =
    role === UserRole.ADMIN
      ? 'bg-bento-accent text-bento-dark'
      : role === UserRole.PURNA
        ? 'bg-bento-highlight text-bento-primary'
        : 'bg-bento-highlight text-bento-primary';

  return (
    <div className="scout-member-card">
      <div className="flex items-center gap-3">
        <div className={`scout-avatar ${avatarBg}`}>
          {getInitials(member.nama)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm text-bento-text truncate leading-tight">{member.nama}</p>
            <StatusBadge member={member} onToggle={() => onToggleStatus(member)} />
          </div>
          <p className="text-[11px] text-bento-muted truncate mt-0.5">{member.email}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {role === UserRole.ANGGOTA ? (
          <>
            <span className="scout-chip">Kelas {member.kelas}</span>
            <span className="scout-chip">Regu {member.regu}</span>
          </>
        ) : role === UserRole.PURNA ? (
          <PurnaProfileBadge member={member} />
        ) : (
          <span className="scout-chip">{member.kelas} · {member.regu}</span>
        )}
      </div>

      <div className="scout-action-row">
        <button type="button" onClick={() => onEdit(member)} className="scout-action-btn">
          <Edit2 className="w-3.5 h-3.5" />
          Ubah
        </button>
        <button type="button" onClick={() => onDelete(member.userId)} className="scout-action-btn scout-action-btn-danger">
          <Trash2 className="w-3.5 h-3.5" />
          Hapus
        </button>
      </div>
    </div>
  );
}

function PurnaProfileBadge({ member }: { member: UserProfile }) {
  if (isPreRegisteredUserId(member.userId)) {
    return (
      <span className="inline-flex items-center gap-1 scout-chip text-sky-800 bg-sky-50 border-sky-200">
        <Clock className="w-3 h-3" />
        Belum login
      </span>
    );
  }

  const complete = isPurnaProfileComplete(member);
  return complete ? (
    <span className="inline-flex items-center gap-1 scout-chip text-lime-800 bg-lime-50 border-lime-200">
      <CheckCircle2 className="w-3 h-3" />
      Profil lengkap
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 scout-chip text-amber-800 bg-amber-50 border-amber-200">
      <Clock className="w-3 h-3" />
      Menunggu biodata
    </span>
  );
}

function CompactPurnaRow({
  member,
  onView,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  member: UserProfile;
  onView?: (m: UserProfile) => void;
  onEdit: (m: UserProfile) => void;
  onDelete: (userId: string) => void;
  onToggleStatus: (m: UserProfile) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-white hover:bg-bento-soft/40 transition">
      <div className="w-8 h-8 rounded-lg bg-bento-highlight text-bento-primary flex items-center justify-center text-[11px] font-bold shrink-0">
        {getInitials(member.nama)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-bento-text truncate">{member.nama}</p>
        <p className="text-[10px] text-bento-muted truncate font-mono">{member.email}</p>
      </div>
      <div className="hidden sm:block shrink-0">
        <PurnaProfileBadge member={member} />
      </div>
      <StatusBadge member={member} onToggle={() => onToggleStatus(member)} />
      <div className="flex items-center gap-1 shrink-0">
        {onView && (
          <button
            type="button"
            onClick={() => onView(member)}
            className="p-1.5 hover:bg-bento-soft text-bento-muted transition rounded-lg cursor-pointer"
            title="Lihat biodata"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onEdit(member)}
          className="p-1.5 hover:bg-bento-highlight text-bento-primary transition rounded-lg cursor-pointer"
          title="Ubah"
        >
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(member.userId)}
          className="p-1.5 hover:bg-rose-50 text-rose-700 transition rounded-lg cursor-pointer"
          title="Hapus"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
