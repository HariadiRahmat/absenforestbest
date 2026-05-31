/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Edit2, Save, User } from 'lucide-react';
import { UserProfile } from '../types';
import {
  emptyOnboardingForm,
  OnboardingFormData,
  validateMemberBiodataForm,
} from '../lib/onboardingProfile';
import { MemberBiodataFields, MemberBiodataView } from './MemberBiodataFields';
import { Alert } from './ui/Alert';

interface MemberBiodataPanelProps {
  profile: UserProfile;
  onSave: (form: OnboardingFormData) => Promise<void>;
  title?: string;
  subtitle?: string;
}

export function MemberBiodataPanel({
  profile,
  onSave,
  title = 'Biodata Anggota',
  subtitle = 'Data diri lengkap sesuai profil keanggotaan',
}: MemberBiodataPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<OnboardingFormData>(() => emptyOnboardingForm(profile));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setForm(emptyOnboardingForm(profile));
    }
  }, [profile, isEditing]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateMemberBiodataForm(form);
    if (err) {
      setErrorMsg(err);
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await onSave(form);
      setIsEditing(false);
    } catch {
      setErrorMsg('Gagal menyimpan biodata. Periksa koneksi lalu coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="scout-card p-5 sm:p-7">
      <div className="flex items-center justify-between gap-4 mb-6 pb-5 border-b border-bento-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-bento-highlight flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-bento-primary" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-bento-text">{title}</h3>
            <p className="text-xs sm:text-sm text-bento-muted mt-0.5">{subtitle}</p>
          </div>
        </div>
        {!isEditing && (
          <button
            type="button"
            onClick={() => {
              setForm(emptyOnboardingForm(profile));
              setErrorMsg(null);
              setIsEditing(true);
            }}
            className="scout-btn-secondary text-xs py-2.5 px-3.5 shrink-0"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Ubah
          </button>
        )}
      </div>

      {errorMsg && (
        <Alert variant="error" title="Gagal menyimpan" message={errorMsg} className="mb-5" onDismiss={() => setErrorMsg(null)} />
      )}

      {isEditing ? (
        <form onSubmit={handleSave} className="space-y-5">
          <MemberBiodataFields form={form} onChange={setForm} disabled={saving} />
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setErrorMsg(null);
              }}
              disabled={saving}
              className="flex-1 scout-btn-secondary py-3.5 text-sm"
            >
              Batal
            </button>
            <button type="submit" disabled={saving} className="flex-1 scout-btn-primary py-3.5 text-sm">
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <MemberBiodataView profile={profile} />
      )}
    </div>
  );
}
