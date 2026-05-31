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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, logFirestoreError } from '../lib/firebase';
import { OperationType, PurnaDocumentationLink } from '../types';
import { normalizePurnaLinks, resolvePurnaLinks } from '../lib/purnaLinks';
import { TabNav } from './ui/TabNav';
import { UpcomingEventsPanel } from './UpcomingEventsPanel';
import { MemberBiodataPanel } from './MemberBiodataPanel';

export function PurnaDashboard() {
  const { userProfile, logout, updateMemberBiodata } = useAuth();
  const [activeTab, setActiveTab] = useState<'dokumentasi' | 'profil'>('dokumentasi');
  const [links, setLinks] = useState<PurnaDocumentationLink[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(true);

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

  if (!userProfile) return null;

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
                  {userProfile.nama}
                </h1>
                <p className="text-xs sm:text-sm text-bento-muted mt-1 truncate">{userProfile.email}</p>
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
          <MemberBiodataPanel
            profile={userProfile}
            onSave={updateMemberBiodata}
            title="Biodata Purna"
            subtitle="Data diri anggota purna pramuka"
          />
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
