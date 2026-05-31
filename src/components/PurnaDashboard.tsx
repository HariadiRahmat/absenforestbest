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
import { OperationType } from '../types';
import { normalizePurnaLinks, resolvePurnaLinks } from '../lib/purnaLinks';
import {
  AGAMA_OPTIONS,
  STATUS_PERKAWINAN_OPTIONS,
  purnaFormFromProfile,
} from '../lib/purnaProfile';
import { TabNav } from './ui/TabNav';
import { Alert } from './ui/Alert';

export function PurnaDashboard() {
  const { userProfile, logout, updatePurnaProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'dokumentasi' | 'profil'>('dokumentasi');
  const [links, setLinks] = useState<ReturnType<typeof normalizePurnaLinks>['links']>([]);
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
  const labelClass = 'text-[10px] font-semibold text-bento-muted uppercase tracking-wide';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      await updatePurnaProfile(form);
      setIsEditing(false);
    } catch {
      setSaveError('Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-bento-bg text-bento-text pb-[max(2rem,env(safe-area-inset-bottom))] sm:pb-12">
      <div className="scout-page max-w-4xl pt-4 sm:pt-6">
        <header className="scout-card px-4 py-3.5 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-bento-accent rounded-2xl flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-bento-dark" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-bento-muted">ForestBest Purna</p>
              <h1 className="text-base sm:text-xl font-bold text-bento-text truncate leading-tight">{userProfile?.nama}</h1>
              <p className="text-[11px] sm:text-sm text-bento-muted mt-0.5 truncate">{userProfile?.email}</p>
            </div>
            <button onClick={logout} className="scout-btn-secondary shrink-0 text-xs py-2 px-3 sm:hidden" aria-label="Keluar">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <button onClick={logout} className="scout-btn-secondary hidden sm:inline-flex w-auto mt-4 text-xs py-2.5 px-4">
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </header>

        <div className="mt-4 sm:mt-5">
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
            <div className="scout-card p-4 sm:p-6">
              <div className="scout-section-head">
                <div>
                  <h3 className="text-base font-bold text-bento-text">Dokumentasi Kegiatan</h3>
                  <p className="text-xs sm:text-sm text-bento-muted mt-0.5">Link arsip dan materi kegiatan dari Pembina.</p>
                </div>
                {!loadingLinks && links.length > 0 && (
                  <span className="scout-count-badge">{links.length}</span>
                )}
              </div>

              {loadingLinks ? (
                <div className="text-center py-14 text-bento-muted text-sm">
                  <div className="w-6 h-6 border-2 border-bento-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Memuat link...
                </div>
              ) : links.length === 0 ? (
                <div className="text-center py-14 text-bento-muted text-sm px-4">
                  <FileText className="w-10 h-10 stroke-1 mx-auto mb-3 opacity-30" />
                  <p className="leading-relaxed">Belum ada link dokumentasi. Pembina akan menambahkan link kegiatan di sini.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {links.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="scout-member-card flex items-start gap-3 group hover:border-bento-primary/30 transition"
                    >
                      <div className="scout-avatar bg-bento-highlight text-bento-primary">
                        <ExternalLink className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-bento-text group-hover:text-bento-primary transition truncate">
                          {link.title}
                        </p>
                        {link.description && (
                          <p className="text-xs text-bento-muted mt-0.5 line-clamp-2 leading-relaxed">{link.description}</p>
                        )}
                        <p className="text-[10px] text-bento-muted font-mono mt-1.5 truncate">{link.url}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-bento-muted shrink-0 mt-1 group-hover:text-bento-primary" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'profil' && (
            <div className="scout-card p-4 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-bento-border">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-bento-primary" />
                  <h3 className="text-base font-bold text-bento-text">Biodata Purna</h3>
                </div>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm(purnaFormFromProfile(userProfile!));
                      setIsEditing(true);
                    }}
                    className="scout-btn-secondary text-xs py-2 px-3"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Ubah
                  </button>
                )}
              </div>

              {saveError && <Alert variant="error" title="Gagal" message={saveError} className="mb-4" />}

              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <Field label="Nama" icon={User}>
                    <input className={inputClass} value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} required />
                  </Field>
                  <Field label="Tanggal Lahir" icon={Calendar}>
                    <input type="date" className={`${inputClass} scout-date-input`} value={form.tanggalLahir} onChange={(e) => setForm({ ...form, tanggalLahir: e.target.value })} required />
                  </Field>
                  <Field label="Alamat" icon={MapPin}>
                    <textarea className={`${inputClass} min-h-[80px]`} value={form.alamat} onChange={(e) => setForm({ ...form, alamat: e.target.value })} required />
                  </Field>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <div className="pt-2 border-t border-bento-border space-y-3">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-bento-primary" />
                      <p className="text-sm font-bold">Jejak Pendidikan</p>
                    </div>
                    {[
                      ['SD', 'pendidikanSd', true],
                      ['SMP', 'pendidikanSmp', true],
                      ['SMA', 'pendidikanSma', true],
                      ['Kuliah', 'pendidikanKuliah', false],
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
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setIsEditing(false)} className="flex-1 scout-btn-secondary py-3 text-sm">Batal</button>
                    <button type="submit" disabled={saving} className="flex-1 scout-btn-primary py-3 text-sm">
                      {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" /> : <><Save className="w-4 h-4" /> Simpan</>}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-0 divide-y divide-bento-border">
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
    <div className="space-y-1">
      <span className="text-[10px] font-semibold text-bento-muted uppercase tracking-wide">{label}</span>
      {Icon ? (
        <div className="relative">
          <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bento-muted" />
          <div className="pl-0">{children}</div>
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
    <div className="py-3 flex items-start justify-between gap-3 text-sm">
      <span className="text-bento-muted shrink-0 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {label}
      </span>
      <span className={`font-semibold text-bento-text text-right ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</span>
    </div>
  );
}
