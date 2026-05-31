/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import { UserProfile, UserRole, UserStatus } from '../../types';
import { isPreRegisteredUserId } from '../../lib/purnaDirectory';
import { isOnboardingComplete, emptyOnboardingForm, OnboardingFormData, validateMemberBiodataForm } from '../../lib/onboardingProfile';
import { MemberBiodataFields, MemberBiodataView } from '../MemberBiodataFields';
import { Alert } from '../ui/Alert';

export interface MemberProfileSavePayload {
  biodata?: OnboardingFormData;
  nama?: string;
  kelas?: string;
  regu?: string;
  role?: UserRole;
  status?: UserStatus;
}

interface MemberProfileModalProps {
  member: UserProfile;
  initialMode?: 'view' | 'edit';
  onClose: () => void;
  onSave: (member: UserProfile, payload: MemberProfileSavePayload) => Promise<void>;
  lockRole?: boolean;
}

function roleTitle(role: UserRole): string {
  if (role === UserRole.ADMIN) return 'Pembina';
  if (role === UserRole.PURNA) return 'Purna';
  return 'Anggota';
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">{label}</p>
      <p className="text-sm text-bento-text mt-0.5 break-words">{value?.trim() || '—'}</p>
    </div>
  );
}

export function MemberProfileModal({
  member,
  initialMode = 'view',
  onClose,
  onSave,
  lockRole = false,
}: MemberProfileModalProps) {
  const showFullBiodata = member.role !== UserRole.ADMIN;
  const notLoggedIn = isPreRegisteredUserId(member.userId);
  const profileComplete = isOnboardingComplete(member);

  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [form, setForm] = useState<OnboardingFormData>(() => emptyOnboardingForm(member));
  const [nama, setNama] = useState(member.nama);
  const [kelas, setKelas] = useState(member.kelas);
  const [regu, setRegu] = useState(member.regu);
  const [role, setRole] = useState(member.role);
  const [status, setStatus] = useState(member.status);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setForm(emptyOnboardingForm(member));
    setNama(member.nama);
    setKelas(member.kelas);
    setRegu(member.regu);
    setRole(member.role);
    setStatus(member.status);
    setMode(initialMode);
    setErrorMsg(null);
  }, [member, initialMode]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (showFullBiodata) {
      const err = validateMemberBiodataForm(form);
      if (err) {
        setErrorMsg(err);
        return;
      }
    } else if (!nama.trim() || !kelas.trim() || !regu.trim()) {
      setErrorMsg('Nama, unit, dan bagian wajib diisi.');
      return;
    }

    setSaving(true);
    try {
      await onSave(member, showFullBiodata
        ? { biodata: form, role, status }
        : { nama: nama.trim(), kelas: kelas.trim(), regu: regu.trim(), role, status });
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan data.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-4 py-3 border border-bento-border rounded-xl text-sm bg-bento-soft focus:outline-none focus:ring-2 focus:ring-bento-primary/30';

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Tutup" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-bento-border px-4 py-3 flex items-center justify-between gap-3 z-10">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">
              Biodata {roleTitle(member.role)}
            </p>
            <h3 className="text-base font-bold text-bento-text truncate">{member.nama}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {mode === 'view' && (
              <button
                type="button"
                onClick={() => setMode('edit')}
                className="scout-btn-secondary text-xs py-2 px-3 gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Ubah
              </button>
            )}
            <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-bento-soft text-bento-muted" aria-label="Tutup">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className={`scout-chip ${member.status === UserStatus.AKTIF ? 'text-lime-800 bg-lime-50 border-lime-200' : ''}`}>
              {member.status === UserStatus.AKTIF ? 'Aktif' : 'Nonaktif'}
            </span>
            {notLoggedIn ? (
              <span className="scout-chip text-sky-800 bg-sky-50 border-sky-200">Belum login</span>
            ) : showFullBiodata && (
              profileComplete ? (
                <span className="scout-chip text-lime-800 bg-lime-50 border-lime-200">Profil lengkap</span>
              ) : (
                <span className="scout-chip text-amber-800 bg-amber-50 border-amber-200">Menunggu biodata</span>
              )
            )}
          </div>

          {errorMsg && <Alert variant="error" title="Gagal menyimpan" message={errorMsg} />}

          {mode === 'view' ? (
            showFullBiodata ? (
              <MemberBiodataView profile={member} />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nama Lengkap" value={member.nama} />
                <Field label="Email Google" value={member.email} />
                <Field label="Unit / Jabatan" value={member.kelas} />
                <Field label="Bagian" value={member.regu} />
                <Field label="Role" value={roleTitle(member.role)} />
                <Field label="Status" value={member.status === UserStatus.AKTIF ? 'Aktif' : 'Nonaktif'} />
              </div>
            )
          ) : (
            <form id="member-profile-edit-form" onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-bento-soft/60 rounded-xl border border-bento-border">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">Email Google</label>
                  <input className={`${inputClass} font-mono text-xs opacity-70`} value={member.email} readOnly disabled />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">Role</label>
                  <select
                    className="scout-select w-full"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    disabled={lockRole || saving}
                  >
                    <option value={UserRole.ANGGOTA}>Anggota</option>
                    <option value={UserRole.ADMIN}>Pembina</option>
                    <option value={UserRole.PURNA}>Purna</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">Status</label>
                  <select
                    className="scout-select w-full"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as UserStatus)}
                    disabled={saving}
                  >
                    <option value={UserStatus.AKTIF}>Aktif</option>
                    <option value={UserStatus.NON_AKTIF}>Nonaktif</option>
                  </select>
                </div>
              </div>

              {showFullBiodata ? (
                <MemberBiodataFields form={form} onChange={setForm} disabled={saving} />
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">Nama Lengkap</label>
                    <input className={inputClass} value={nama} onChange={(e) => setNama(e.target.value)} disabled={saving} required />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">Unit / Jabatan</label>
                      <input className={inputClass} value={kelas} onChange={(e) => setKelas(e.target.value)} disabled={saving} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">Bagian</label>
                      <input className={inputClass} value={regu} onChange={(e) => setRegu(e.target.value)} disabled={saving} required />
                    </div>
                  </div>
                </div>
              )}
            </form>
          )}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-bento-border p-4 flex gap-2">
          {mode === 'edit' ? (
            <>
              <button type="button" onClick={() => setMode('view')} disabled={saving} className="flex-1 scout-btn-secondary py-2.5 text-sm">
                Batal
              </button>
              <button type="submit" form="member-profile-edit-form" disabled={saving} className="flex-1 scout-btn-primary py-2.5 text-sm">
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Simpan Data
                  </>
                )}
              </button>
            </>
          ) : (
            <button type="button" onClick={onClose} className="w-full scout-btn-secondary py-2.5 text-sm">
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
