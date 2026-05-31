/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  User,
  MapPin,
  Calendar,
  BookOpen,
  GraduationCap,
  LogOut,
  Check,
  Phone,
  Shield,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from './ui/Alert';
import {
  AGAMA_OPTIONS,
  STATUS_PERKAWINAN_OPTIONS,
} from '../lib/purnaProfile';
import {
  emptyOnboardingForm,
  KELAS_OPTIONS,
  OnboardingFormData,
  validateOnboardingStep,
} from '../lib/onboardingProfile';

const TOTAL_STEPS = 3;

export function OnboardingWizard() {
  const { currentUser, userProfile, completeOnboarding, logout } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<OnboardingFormData>(() => emptyOnboardingForm(userProfile));
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const inputClass =
    'w-full px-4 py-3 border border-bento-border focus:outline-none focus:ring-2 focus:ring-bento-primary/30 focus:border-bento-primary rounded-xl text-sm bg-bento-soft placeholder-bento-muted';
  const labelClass = 'text-[11px] font-semibold text-bento-muted uppercase tracking-wide';

  const progress = (step / TOTAL_STEPS) * 100;

  const goNext = () => {
    const err = validateOnboardingStep(step, form);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg(null);
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  };

  const goBack = () => {
    setErrorMsg(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateOnboardingStep(step, form);
    if (err) {
      setErrorMsg(err);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await completeOnboarding(form);
    } catch {
      setErrorMsg('Gagal menyimpan profil. Periksa koneksi lalu coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bento-bg flex flex-col justify-center py-6 sm:py-10 px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <div className="max-w-lg w-full mx-auto scout-card overflow-hidden">
        <div className="px-5 sm:px-8 pt-6 sm:pt-8 pb-4 border-b border-bento-border">
          <div className="flex items-center justify-between gap-3 mb-4">
            <p className="text-xs font-semibold text-bento-muted">Langkah {step}/{TOTAL_STEPS}</p>
            <div className="w-8 h-8 rounded-xl bg-bento-accent flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-bento-dark" />
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-bento-soft overflow-hidden mb-5">
            <div
              className="h-full bg-bento-accent transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {step === 1 && (
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-bento-text leading-snug">Data Diri</h2>
              <p className="text-sm text-bento-muted mt-2 leading-relaxed">
                Lengkapi identitas dasar Anda sebagai anggota ForestBest Scout.
              </p>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-bento-text leading-snug">Status Keanggotaan</h2>
              <p className="text-sm text-bento-muted mt-2 leading-relaxed">
                Pilih status keanggotaan dan informasi kelas jika masih aktif.
              </p>
            </>
          )}
          {step === 3 && (
            <>
              <h2 className="text-xl sm:text-2xl font-bold text-bento-text leading-snug">Pendidikan & Keluarga</h2>
              <p className="text-sm text-bento-muted mt-2 leading-relaxed">
                Jejak pendidikan dan status pernikahan untuk arsip keanggotaan.
              </p>
            </>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-4">
          {errorMsg && <Alert variant="error" title="Perhatian" message={errorMsg} onDismiss={() => setErrorMsg(null)} />}

          <div className="space-y-1">
            <span className={labelClass}>Email Google</span>
            <div className="w-full px-4 py-3 bg-bento-soft border border-bento-border rounded-xl text-bento-muted font-mono text-sm truncate">
              {currentUser?.email}
            </div>
          </div>

          {step === 1 && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nama Depan" icon={User}>
                  <input
                    type="text"
                    className={inputClass}
                    value={form.namaDepan}
                    onChange={(e) => setForm({ ...form, namaDepan: e.target.value })}
                    disabled={submitting}
                    required
                  />
                </Field>
                <Field label="Nama Belakang" icon={User}>
                  <input
                    type="text"
                    className={inputClass}
                    value={form.namaBelakang}
                    onChange={(e) => setForm({ ...form, namaBelakang: e.target.value })}
                    disabled={submitting}
                    required
                  />
                </Field>
              </div>

              <Field label="Tempat Lahir" icon={MapPin}>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Contoh: Makassar"
                  value={form.tempatLahir}
                  onChange={(e) => setForm({ ...form, tempatLahir: e.target.value })}
                  disabled={submitting}
                  required
                />
              </Field>

              <Field label="Tanggal Lahir" icon={Calendar}>
                <input
                  type="date"
                  className={`${inputClass} scout-date-input`}
                  value={form.tanggalLahir}
                  onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })}
                  disabled={submitting}
                  required
                />
              </Field>

              <Field label="Alamat Lengkap" icon={MapPin}>
                <textarea
                  className={`${inputClass} min-h-[88px] resize-y`}
                  value={form.alamat}
                  onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                  disabled={submitting}
                  required
                />
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Agama">
                  <select
                    className="scout-select"
                    value={form.agama}
                    onChange={(e) => setForm({ ...form, agama: e.target.value })}
                    disabled={submitting}
                  >
                    {AGAMA_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </Field>
                <Field label="No. HP (opsional)" icon={Phone}>
                  <input
                    type="tel"
                    className={inputClass}
                    placeholder="08xxxxxxxxxx"
                    value={form.noHp}
                    onChange={(e) => setForm({ ...form, noHp: e.target.value })}
                    disabled={submitting}
                  />
                </Field>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <span className={labelClass}>Status Keanggotaan</span>
                <div className="flex flex-wrap gap-2">
                  <ChipOption
                    label="Anggota Aktif"
                    selected={form.membershipStatus === 'aktif'}
                    onClick={() => setForm({ ...form, membershipStatus: 'aktif' })}
                    disabled={submitting}
                  />
                  <ChipOption
                    label="Sudah Purna"
                    selected={form.membershipStatus === 'purna'}
                    onClick={() => setForm({ ...form, membershipStatus: 'purna', kelas: '', regu: '' })}
                    disabled={submitting}
                  />
                </div>
              </div>

              {form.membershipStatus === 'aktif' && (
                <>
                  <div className="space-y-2">
                    <span className={labelClass}>Kelas Saat Ini</span>
                    <div className="flex flex-wrap gap-2">
                      {KELAS_OPTIONS.map((kelas) => (
                        <ChipOption
                          key={kelas}
                          label={`Kelas ${kelas}`}
                          selected={form.kelas === kelas}
                          onClick={() => setForm({ ...form, kelas })}
                          disabled={submitting}
                        />
                      ))}
                    </div>
                  </div>

                  <Field label="Regu">
                    <input
                      type="text"
                      className={inputClass}
                      placeholder="Contoh: Rajawali"
                      value={form.regu}
                      onChange={(e) => setForm({ ...form, regu: e.target.value })}
                      disabled={submitting}
                      required
                    />
                  </Field>
                </>
              )}

              <Field label="Tahun Masuk ForestBest">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  className={inputClass}
                  placeholder="Contoh: 2020"
                  value={form.tahunMasuk}
                  onChange={(e) => setForm({ ...form, tahunMasuk: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                  disabled={submitting}
                  required
                />
              </Field>
            </>
          )}

          {step === 3 && (
            <>
              <div className="pt-1 border-t border-bento-border">
                <div className="flex items-center gap-2 mb-3 mt-4">
                  <GraduationCap className="w-4 h-4 text-bento-primary" />
                  <p className="text-sm font-bold text-bento-text">Jejak Pendidikan</p>
                </div>
                <div className="space-y-3">
                  {[
                    ['SD', 'pendidikanSd', true],
                    ['SMP', 'pendidikanSmp', true],
                    ['SMA', 'pendidikanSma', true],
                    ['Kuliah (opsional)', 'pendidikanKuliah', false],
                  ].map(([label, key, req]) => (
                    <Field key={key as string} label={label as string} icon={BookOpen}>
                      <input
                        type="text"
                        className={inputClass}
                        placeholder={`Nama sekolah / universitas ${label}`}
                        value={form[key as keyof OnboardingFormData] as string}
                        onChange={(e) => setForm({ ...form, [key as string]: e.target.value })}
                        disabled={submitting}
                        required={req as boolean}
                      />
                    </Field>
                  ))}
                </div>
              </div>

              <Field label="Status Pernikahan">
                <select
                  className="scout-select"
                  value={form.statusPerkawinan}
                  onChange={(e) => setForm({ ...form, statusPerkawinan: e.target.value })}
                  disabled={submitting}
                >
                  {STATUS_PERKAWINAN_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </Field>
            </>
          )}

          <div className="flex gap-2 pt-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={goBack}
                disabled={submitting}
                className="flex-1 scout-btn-secondary py-3 text-sm"
              >
                Kembali
              </button>
            ) : (
              <button
                type="button"
                onClick={logout}
                disabled={submitting}
                className="flex-1 scout-btn-secondary py-3 text-sm"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                disabled={submitting}
                className="flex-1 scout-btn-primary py-3 text-sm"
              >
                Lanjut
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="flex-1 scout-btn-primary py-3 text-sm">
                {submitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  'Selesai & Masuk'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-semibold text-bento-muted uppercase tracking-wide">{label}</span>
      {Icon ? (
        <div className="relative">
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bento-muted pointer-events-none z-10" />
          <div className="[&_input]:pl-10 [&_textarea]:pl-10">{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function ChipOption({
  label,
  selected,
  onClick,
  disabled,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold border transition ${
        selected
          ? 'border-bento-dark bg-bento-accent/40 text-bento-dark'
          : 'border-bento-border bg-white text-bento-text hover:border-bento-primary/40'
      }`}
    >
      {selected && (
        <span className="w-4 h-4 rounded-full bg-bento-accent border border-bento-dark flex items-center justify-center">
          <Check className="w-2.5 h-2.5 text-bento-dark" />
        </span>
      )}
      {label}
    </button>
  );
}
