/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  Award,
  ExternalLink,
  FileText,
  LogOut,
  User,
  Save,
  Edit2,
  Calendar,
  MapPin,
  BookOpen,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, logFirestoreError } from '../lib/firebase';
import { OperationType, PurnaDocumentationLink } from '../types';
import { normalizePurnaLinks, resolvePurnaLinks } from '../lib/purnaLinks';
import {
  AGAMA_OPTIONS,
  STATUS_PERKAWINAN_OPTIONS,
  purnaFormFromProfile,
} from '../lib/purnaProfile';
import { parseFormAlertMessage } from '../lib/friendlyErrors';
import { TabNav } from './ui/TabNav';
import { Alert } from './ui/Alert';
import { UpcomingEventsPanel } from './UpcomingEventsPanel';

export function PurnaDashboard() {
  const { userProfile, logout, updatePurnaProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'dokumentasi' | 'profil'>('dokumentasi');
  const [links, setLinks] = useState<PurnaDocumentationLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const initial = purnaFormFromProfile(userProfile!);
  const [form, setForm] = useState(initial);

  useEffect(() => {
    const ref = doc(db, 'settings', 'purna_links');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setLinks(resolvePurnaLinks(snap.data() as Record<string, unknown>).links);
        } else {
          setLinks(resolvePurnaLinks().links);
        }
        setLoadingLinks(false);
      },
      (err) => {
        logFirestoreError(err, OperationType.GET, 'settings/purna_links');
        setLoadingLinks(false);
      }
    );
    return () => unsub();
  }, []);

  const inputClass =
    'w-full px-4 py-3 border border-bento-border rounded-xl text-sm bg-bento-soft focus:outline-none focus:ring-2 focus:ring-bento-primary/30';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await updatePurnaProfile(form);
      setIsEditing(false);
    } catch {
      setSaveError('Gagal menyimpan profil. Periksa koneksi lalu coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const saveAlert = saveError ? parseFormAlertMessage(saveError, 'Gagal menyimpan') : null;

  return (
    <div className="min-h-screen bg-bento-bg text-bento-text pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:pb-12">
      <div className="scout-page max-w-4xl pt-5 sm:pt-8 space-y-5 sm:space-y-6">
        <header className="scout-card px-5 py-5 sm:px-6 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-bento-accent rounded-2xl flex items-center justify-center shrink-0">
                <Award className="w-6 h-6 sm:w-7 sm:h-7 text-bento-dark" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-bento-muted">
                  ForestBest Purna
                </p>
                <h1 className="text-lg sm:text-xl font-bold text-bento-text truncate leading-tight mt-0.5">
                  {userProfile?.nama}
                </h1>
                <p className="text-xs sm:text-sm text-bento-muted mt-1 truncate">{userProfile?.email}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="scout-btn-secondary shrink-0 text-xs py-2.5 px-3.5 gap-1.5"
              aria-label="Keluar"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden min-[380px]:inline">Keluar</span>
            </button>
          </div>
        </header>

        <UpcomingEventsPanel />

        <TabNav
          tabs={[
            { id: 'purna-tab-docs', key: 'dokumentasi', label: 'Dokumentasi', icon: FileText },
            { id: 'purna-tab-profil', key: 'profil', label: 'Profil', icon: User },
          ]}
          active={activeTab}
          onChange={setActiveTab}
          columns={2}
        />

        {activeTab === 'dokumentasi' && (
          <div className="scout-card p-5 sm:p-7">
            <div className="scout-section-head">
              <div className="min-w-0 pr-2">
                <h3 className="text-base sm:text-lg font-bold text-bento-text">Dokumentasi Kegiatan</h3>
                <p className="text-sm text-bento-muted mt-1.5 leading-relaxed">
                  Link arsip dan materi kegiatan dari Pembina.
                </p>
              </div>
              {!loadingLinks && links.length > 0 && (
                <span className="scout-count-badge">{links.length}</span>
              )}
            </div>

            {loadingLinks ? (
              <div className="text-center py-16 text-bento-muted text-sm">
                <div className="w-7 h-7 border-2 border-bento-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Memuat link...
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-16 text-bento-muted text-sm px-2">
                <FileText className="w-11 h-11 stroke-1 mx-auto mb-4 opacity-30" />
                <p className="leading-relaxed max-w-xs mx-auto">
                  Belum ada link dokumentasi. Pembina akan menambahkan link kegiatan di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-3.5">
                {links.map((link) => (
                  <DocLinkCard key={link.id} link={link} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profil' && (
          <div className="scout-card p-5 sm:p-7">
            <div className="flex items-center justify-between gap-4 mb-6 pb-5 border-b border-bento-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-bento-highlight flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-bento-primary" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-bento-text">Biodata Purna</h3>
                  <p className="text-xs sm:text-sm text-bento-muted mt-0.5">Data diri anggota purna pramuka</p>
                </div>
              </div>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => {
                    setForm(purnaFormFromProfile(userProfile!));
                    setIsEditing(true);
                  }}
                  className="scout-btn-secondary text-xs py-2.5 px-3.5 shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Ubah
                </button>
              )}
            </div>

            {saveAlert && (
              <Alert
                variant="error"
                title={saveAlert.title}
                message={saveAlert.message}
                tips={saveAlert.tips}
                className="mb-5"
                onDismiss={() => setSaveError(null)}
              />
            )}

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="space-y-5">
                <Field label="Nama" icon={User}>
                  <input className={inputClass} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
                </Field>
                <Field label="Tanggal Lahir" icon={Calendar}>
                  <input type="date" className={`${inputClass} scout-date-input`} value={form.tanggalLahir} onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })} required />
                </Field>
                <Field label="Alamat" icon={MapPin}>
                  <textarea className={`${inputClass} min-h-[96px] resize-y`} value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} required />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Agama">
                    <select className="scout-select" value={form.agama} onChange={(e) => setForm({ ...form, agama: e.target.value })}>
                      {AGAMA_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Field>
                  <Field label="Status Perkawinan">
                    <select className="scout-select" value={form.statusPerkawinan} onChange={(e) => setForm({ ...form, statusPerkawinan: e.target.value })}>
                      {STATUS_PERKAWINAN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="pt-4 border-t border-bento-border space-y-4">
                  <div className="flex items-center gap-2.5">
                    <GraduationCap className="w-5 h-5 text-bento-primary" />
                    <p className="text-sm font-bold text-bento-text">Jejak Pendidikan</p>
                  </div>
                  {[
                    ['SD', 'pendidikanSd', true],
                    ['SMP', 'pendidikanSmp', true],
                    ['SMA', 'pendidikanSma', true],
                    ['Kuliah (opsional)', 'pendidikanKuliah', false],
                  ].map(([label, key, req]) => (
                    <Field key={key as string} label={label as string}>
                      <input
                        className={inputClass}
                        value={form[key as keyof typeof form] as string}
                        onChange={(e) => setForm({ ...form, [key as string]: e.target.value })}
                        required={req as boolean}
                      />
                    </Field>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button type="button" onClick={() => setIsEditing(false)} className="flex-1 scout-btn-secondary py-3.5 text-sm">
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
              <div className="divide-y divide-bento-border">
                <ProfileRow label="Nama" value={userProfile?.nama} />
                <ProfileRow label="Email" value={userProfile?.email} mono />
                <ProfileRow label="Tanggal Lahir" value={userProfile?.tanggalLahir} />
                <ProfileRow label="Alamat" value={userProfile?.alamat} />
                <ProfileRow label="Agama" value={userProfile?.agama} />
                <ProfileRow label="Status Perkawinan" value={userProfile?.statusPerkawinan} />
                <ProfileRow label="SD" value={userProfile?.pendidikanSd} icon={BookOpen} />
                <ProfileRow label="SMP" value={userProfile?.pendidikanSmp} />
                <ProfileRow label="SMA" value={userProfile?.pendidikanSma} />
                <ProfileRow label="Kuliah" value={userProfile?.pendidikanKuliah || '—'} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DocLinkCard({ link }: { link: PurnaDocumentationLink }) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="scout-doc-link group"
    >
      <div className="scout-doc-link-icon">
        <FileText className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="text-sm sm:text-[15px] font-semibold text-bento-text group-hover:text-bento-primary transition leading-snug">
          {link.title}
        </p>
        {link.description && (
          <p className="text-xs sm:text-sm text-bento-muted mt-1.5 line-clamp-2 leading-relaxed">
            {link.description}
          </p>
        )}
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-bento-primary mt-3">
          Buka dokumentasi
          <ExternalLink className="w-3.5 h-3.5" />
        </span>
      </div>
    </a>
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
    <div className="space-y-2">
      <span className="text-[11px] font-semibold text-bento-muted uppercase tracking-wide">{label}</span>
      {Icon ? (
        <div className="relative">
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bento-muted pointer-events-none" />
          <div className="[&_input]:pl-10">{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

function ProfileRow({
  label,
  value,
  mono,
  icon: Icon,
}: {
  label: string;
  value?: string;
  mono?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="py-4 sm:py-4 flex items-start justify-between gap-4 text-sm">
      <span className="text-bento-muted shrink-0 flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </span>
      <span className={`font-semibold text-bento-text text-right leading-relaxed ${mono ? 'font-mono text-xs break-all' : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}
