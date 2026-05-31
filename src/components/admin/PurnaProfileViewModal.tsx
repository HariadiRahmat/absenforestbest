/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, MapPin, GraduationCap } from 'lucide-react';
import { UserProfile, UserStatus } from '../../types';
import { isPurnaProfileComplete } from '../../lib/purnaProfile';
import { isPreRegisteredUserId } from '../../lib/purnaDirectory';

interface PurnaProfileViewModalProps {
  member: UserProfile;
  onClose: () => void;
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">{label}</p>
      <p className="text-sm text-bento-text mt-0.5 break-words">{value?.trim() || '—'}</p>
    </div>
  );
}

export function PurnaProfileViewModal({ member, onClose }: PurnaProfileViewModalProps) {
  const notLoggedIn = isPreRegisteredUserId(member.userId);
  const profileComplete = isPurnaProfileComplete(member);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Tutup" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-bento-border px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">Biodata Purna</p>
            <h3 className="text-base font-bold text-bento-text truncate">{member.nama}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-bento-soft text-bento-muted shrink-0"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`scout-chip ${member.status === UserStatus.AKTIF ? 'text-lime-800 bg-lime-50 border-lime-200' : ''}`}>
              {member.status === UserStatus.AKTIF ? 'Aktif' : 'Nonaktif'}
            </span>
            {notLoggedIn ? (
              <span className="scout-chip text-sky-800 bg-sky-50 border-sky-200">Belum login</span>
            ) : profileComplete ? (
              <span className="scout-chip text-lime-800 bg-lime-50 border-lime-200">Profil lengkap</span>
            ) : (
              <span className="scout-chip text-amber-800 bg-amber-50 border-amber-200">Menunggu biodata</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Nama Lengkap" value={member.nama} />
            <Field label="Email Google" value={member.email} />
            <Field label="Tanggal Lahir" value={member.tanggalLahir} />
            <Field label="Agama" value={member.agama} />
            <Field label="Status Perkawinan" value={member.statusPerkawinan} />
            <Field label="Kelas / Regu" value={`${member.kelas} · ${member.regu}`} />
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Alamat
            </p>
            <p className="text-sm text-bento-text mt-1 leading-relaxed">{member.alamat?.trim() || '—'}</p>
          </div>

          <div className="pt-2 border-t border-bento-border space-y-3">
            <p className="text-xs font-bold text-bento-text flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-bento-primary" />
              Jejak Pendidikan
            </p>
            <div className="grid grid-cols-1 gap-3">
              <Field label="SD" value={member.pendidikanSd} />
              <Field label="SMP" value={member.pendidikanSmp} />
              <Field label="SMA" value={member.pendidikanSma} />
              {member.pendidikanKuliah?.trim() && <Field label="Kuliah" value={member.pendidikanKuliah} />}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-bento-border p-4">
          <button type="button" onClick={onClose} className="w-full scout-btn-secondary py-2.5 text-sm">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
