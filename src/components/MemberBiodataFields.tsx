/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Calendar, MapPin, Phone, User, GraduationCap, BookOpen, Check } from 'lucide-react';
import { AGAMA_OPTIONS, STATUS_PERKAWINAN_OPTIONS } from '../lib/purnaProfile';
import {
  KELAS_OPTIONS,
  MembershipStatus,
  OnboardingFormData,
} from '../lib/onboardingProfile';

const inputClass =
  'w-full px-4 py-3 border border-bento-border focus:outline-none focus:ring-2 focus:ring-bento-primary/30 focus:border-bento-primary rounded-xl text-sm bg-bento-soft placeholder-bento-muted';
const labelClass = 'text-[11px] font-semibold text-bento-muted uppercase tracking-wide';

interface MemberBiodataFieldsProps {
  form: OnboardingFormData;
  onChange: (form: OnboardingFormData) => void;
  disabled?: boolean;
}

export function MemberBiodataFields({ form, onChange, disabled = false }: MemberBiodataFieldsProps) {
  const set = (patch: Partial<OnboardingFormData>) => onChange({ ...form, ...patch });

  const membershipChip = (value: MembershipStatus, label: string) => {
    const selected = form.membershipStatus === value;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const next: Partial<OnboardingFormData> = { membershipStatus: value };
          if (value === 'purna') {
            next.kelas = '';
            next.regu = '';
          }
          set(next);
        }}
        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-semibold transition ${
          selected
            ? 'border-bento-primary bg-bento-highlight text-bento-text'
            : 'border-bento-border bg-white text-bento-muted hover:border-bento-primary/40'
        }`}
      >
        <span
          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
            selected ? 'border-bento-primary bg-bento-primary text-white' : 'border-bento-border'
          }`}
        >
          {selected && <Check className="w-3 h-3" />}
        </span>
        {label}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <p className="text-xs font-bold text-bento-text">Identitas</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelClass}>Nama Depan</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bento-muted" />
              <input
                className={`${inputClass} pl-10`}
                value={form.namaDepan}
                onChange={(e) => set({ namaDepan: e.target.value })}
                disabled={disabled}
                required
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Nama Belakang</label>
            <input
              className={inputClass}
              value={form.namaBelakang}
              onChange={(e) => set({ namaBelakang: e.target.value })}
              disabled={disabled}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelClass}>Tempat Lahir</label>
            <input
              className={inputClass}
              value={form.tempatLahir}
              onChange={(e) => set({ tempatLahir: e.target.value })}
              disabled={disabled}
              required
            />
          </div>
          <div className="space-y-1">
            <label className={labelClass}>Tanggal Lahir</label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bento-muted" />
              <input
                type="date"
                className={`${inputClass} pl-10 scout-date-input`}
                value={form.tanggalLahir}
                onChange={(e) => set({ tanggalLahir: e.target.value })}
                disabled={disabled}
                required
              />
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Alamat</label>
          <div className="relative">
            <MapPin className="absolute left-3.5 top-3.5 w-4 h-4 text-bento-muted" />
            <textarea
              className={`${inputClass} pl-10 min-h-[88px] resize-y`}
              value={form.alamat}
              onChange={(e) => set({ alamat: e.target.value })}
              disabled={disabled}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className={labelClass}>Agama</label>
            <select
              className="scout-select w-full"
              value={form.agama}
              onChange={(e) => set({ agama: e.target.value })}
              disabled={disabled}
            >
              {AGAMA_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className={labelClass}>No. HP (opsional)</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bento-muted" />
              <input
                className={`${inputClass} pl-10`}
                value={form.noHp}
                onChange={(e) => set({ noHp: e.target.value })}
                disabled={disabled}
                placeholder="08xxxxxxxxxx"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 pt-2 border-t border-bento-border">
        <p className="text-xs font-bold text-bento-text">Keanggotaan ForestBest</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {membershipChip('aktif', 'Anggota Aktif')}
          {membershipChip('purna', 'Sudah Purna')}
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Tahun Masuk ForestBest</label>
          <input
            className={inputClass}
            value={form.tahunMasuk}
            onChange={(e) => set({ tahunMasuk: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            disabled={disabled}
            placeholder="2020"
            required
          />
        </div>

        {form.membershipStatus === 'aktif' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={labelClass}>Kelas Saat Ini</label>
              <select
                className="scout-select w-full"
                value={form.kelas}
                onChange={(e) => set({ kelas: e.target.value })}
                disabled={disabled}
                required
              >
                <option value="">Pilih kelas</option>
                {KELAS_OPTIONS.map((k) => (
                  <option key={k} value={k}>Kelas {k}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className={labelClass}>Regu</label>
              <input
                className={inputClass}
                value={form.regu}
                onChange={(e) => set({ regu: e.target.value })}
                disabled={disabled}
                placeholder="Contoh: Rajawali"
                required
              />
            </div>
          </div>
        )}
      </section>

      <section className="space-y-4 pt-2 border-t border-bento-border">
        <p className="text-xs font-bold text-bento-text flex items-center gap-1.5">
          <GraduationCap className="w-4 h-4 text-bento-primary" />
          Jejak Pendidikan
        </p>
        {[
          ['SD', 'pendidikanSd', true],
          ['SMP', 'pendidikanSmp', true],
          ['SMA', 'pendidikanSma', true],
          ['Kuliah (opsional)', 'pendidikanKuliah', false],
        ].map(([label, key, req]) => (
          <div key={key as string} className="space-y-1">
            <label className={labelClass}>{label as string}</label>
            <input
              className={inputClass}
              value={form[key as keyof OnboardingFormData] as string}
              onChange={(e) => set({ [key as string]: e.target.value } as Partial<OnboardingFormData>)}
              disabled={disabled}
              required={req as boolean}
            />
          </div>
        ))}

        <div className="space-y-1">
          <label className={labelClass}>Status Perkawinan</label>
          <select
            className="scout-select w-full"
            value={form.statusPerkawinan}
            onChange={(e) => set({ statusPerkawinan: e.target.value })}
            disabled={disabled}
          >
            {STATUS_PERKAWINAN_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
      </section>
    </div>
  );
}

interface MemberBiodataViewProps {
  profile: {
    nama?: string;
    namaDepan?: string;
    namaBelakang?: string;
    email?: string;
    tempatLahir?: string;
    tanggalLahir?: string;
    alamat?: string;
    agama?: string;
    noHp?: string;
    membershipStatus?: MembershipStatus | string;
    tahunMasuk?: string;
    kelas?: string;
    regu?: string;
    pendidikanSd?: string;
    pendidikanSmp?: string;
    pendidikanSma?: string;
    pendidikanKuliah?: string;
    statusPerkawinan?: string;
  };
}

function ViewField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted">{label}</p>
      <p className="text-sm text-bento-text mt-0.5 break-words">{value?.trim() || '—'}</p>
    </div>
  );
}

export function MemberBiodataView({ profile }: MemberBiodataViewProps) {
  const membership = profile.membershipStatus === 'purna' ? 'purna' : 'aktif';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ViewField label="Nama Depan" value={profile.namaDepan} />
        <ViewField label="Nama Belakang" value={profile.namaBelakang} />
        <ViewField label="Nama Lengkap" value={profile.nama} />
        <ViewField label="Email Google" value={profile.email} />
        <ViewField label="Tempat Lahir" value={profile.tempatLahir} />
        <ViewField label="Tanggal Lahir" value={profile.tanggalLahir} />
        <ViewField label="Agama" value={profile.agama} />
        <ViewField label="No. HP" value={profile.noHp} />
        <ViewField label="Status Keanggotaan" value={membership === 'purna' ? 'Sudah Purna' : 'Anggota Aktif'} />
        <ViewField label="Tahun Masuk ForestBest" value={profile.tahunMasuk} />
        {membership === 'aktif' && (
          <>
            <ViewField label="Kelas" value={profile.kelas} />
            <ViewField label="Regu" value={profile.regu} />
          </>
        )}
        <ViewField label="Status Perkawinan" value={profile.statusPerkawinan} />
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-bento-muted flex items-center gap-1">
          <MapPin className="w-3 h-3" /> Alamat
        </p>
        <p className="text-sm text-bento-text mt-1 leading-relaxed">{profile.alamat?.trim() || '—'}</p>
      </div>

      <div className="pt-2 border-t border-bento-border space-y-3">
        <p className="text-xs font-bold text-bento-text flex items-center gap-1.5">
          <BookOpen className="w-4 h-4 text-bento-primary" />
          Jejak Pendidikan
        </p>
        <div className="grid grid-cols-1 gap-3">
          <ViewField label="SD" value={profile.pendidikanSd} />
          <ViewField label="SMP" value={profile.pendidikanSmp} />
          <ViewField label="SMA" value={profile.pendidikanSma} />
          {profile.pendidikanKuliah?.trim() && <ViewField label="Kuliah" value={profile.pendidikanKuliah} />}
        </div>
      </div>
    </div>
  );
}
