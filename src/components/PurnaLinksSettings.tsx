/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Link2,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  Pencil,
  X,
  FileText,
} from 'lucide-react';
import { db, logFirestoreError } from '../lib/firebase';
import { OperationType, PurnaDocumentationLink } from '../types';
import { emptyPurnaLinksConfig, newPurnaLink, resolvePurnaLinks } from '../lib/purnaLinks';
import { Alert } from './ui/Alert';

const emptyDraft = { title: '', url: '', description: '' };

export function PurnaLinksSettings() {
  const [links, setLinks] = useState<PurnaDocumentationLink[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = doc(db, 'settings', 'purna_links');
    let seeding = false;
    const unsub = onSnapshot(
      ref,
      async (snap) => {
        if (snap.exists()) {
          setLinks(resolvePurnaLinks(snap.data() as Record<string, unknown>).links);
        } else if (!seeding) {
          const defaults = emptyPurnaLinksConfig().links;
          setLinks(defaults);
          seeding = true;
          try {
            await setDoc(ref, { links: defaults, updatedAt: serverTimestamp() }, { merge: true });
          } catch (err) {
            logFirestoreError(err, OperationType.WRITE, 'settings/purna_links');
          }
        }
      },
      (err) => {
        logFirestoreError(err, OperationType.GET, 'settings/purna_links');
        setError('Gagal memuat link dokumentasi.');
      }
    );
    return () => unsub();
  }, []);

  const persistLinks = async (nextLinks: PurnaDocumentationLink[]) => {
    const cleaned = nextLinks
      .map((link, index) => ({
        ...link,
        title: link.title.trim(),
        url: link.url.trim(),
        description: link.description?.trim() || '',
        order: index,
      }))
      .filter((link) => link.title && link.url);

    for (const link of cleaned) {
      if (!link.url.startsWith('http://') && !link.url.startsWith('https://')) {
        throw new Error(`URL "${link.title}" harus diawali http:// atau https://`);
      }
    }

    await setDoc(
      doc(db, 'settings', 'purna_links'),
      { links: cleaned, updatedAt: serverTimestamp() },
      { merge: true }
    );
    setLinks(cleaned);
  };

  const resetDraft = () => {
    setDraft(emptyDraft);
    setEditingId(null);
  };

  const handleSubmitDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.title.trim();
    const url = draft.url.trim();
    const description = draft.description.trim();

    if (!title || !url) {
      setError('Judul dan URL wajib diisi.');
      return;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      setError('URL harus diawali http:// atau https://');
      return;
    }

    setSaving(true);
    setError(null);
    setSaveOk(false);

    try {
      let nextLinks: PurnaDocumentationLink[];

      if (editingId) {
        nextLinks = links.map((link) =>
          link.id === editingId ? { ...link, title, url, description } : link
        );
      } else {
        nextLinks = [...links, { ...newPurnaLink(links.length), title, url, description }];
      }

      await persistLinks(nextLinks);
      resetDraft();
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan link. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (link: PurnaDocumentationLink) => {
    setDraft({
      title: link.title,
      url: link.url,
      description: link.description ?? '',
    });
    setEditingId(link.id);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus link dokumentasi ini?')) return;

    setSaving(true);
    setError(null);
    setSaveOk(false);

    try {
      const nextLinks = links.filter((link) => link.id !== id);
      await persistLinks(nextLinks);
      if (editingId === id) resetDraft();
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus link.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 border border-bento-border rounded-xl text-sm bg-bento-soft focus:outline-none focus:ring-2 focus:ring-bento-primary/30';
  const labelClass = 'text-[10px] font-semibold text-bento-muted uppercase tracking-wide';

  return (
    <div className="w-full max-w-6xl space-y-4">
      <div className="scout-card p-4 sm:p-6">
        <div className="scout-section-head">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-bento-accent flex items-center justify-center shrink-0">
              <Link2 className="w-5 h-5 text-bento-dark" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-bento-text">Link Dokumentasi Purna</h3>
              <p className="text-xs sm:text-sm text-bento-muted mt-0.5 leading-relaxed">
                Atur link kegiatan dan arsip yang dapat diakses oleh Purna ForestBest Scout.
              </p>
            </div>
          </div>
          {links.length > 0 && <span className="scout-count-badge">{links.length}</span>}
        </div>
      </div>

      {error && <Alert variant="error" title="Perhatian" message={error} onDismiss={() => setError(null)} />}
      {saveOk && <Alert variant="success" title="Tersimpan" message="Link dokumentasi berhasil diperbarui." />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        {/* Kiri: form tambah / edit */}
        <div className="scout-card p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-bento-border">
            <h4 className="text-sm font-bold text-bento-text">
              {editingId ? 'Ubah Link' : 'Tambah Link Baru'}
            </h4>
            {editingId && (
              <button
                type="button"
                onClick={resetDraft}
                className="inline-flex items-center gap-1 text-xs font-semibold text-bento-muted hover:text-bento-text"
              >
                <X className="w-3.5 h-3.5" />
                Batal
              </button>
            )}
          </div>

          <form onSubmit={handleSubmitDraft} className="space-y-3.5">
            <div className="space-y-1">
              <label htmlFor="purna-link-title" className={labelClass}>
                Judul
              </label>
              <input
                id="purna-link-title"
                type="text"
                className={inputClass}
                placeholder="Contoh: PERSAMI 2025"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                maxLength={80}
                disabled={saving}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="purna-link-url" className={labelClass}>
                URL
              </label>
              <input
                id="purna-link-url"
                type="url"
                className={`${inputClass} font-mono text-xs`}
                placeholder="https://drive.google.com/..."
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                maxLength={500}
                disabled={saving}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="purna-link-desc" className={labelClass}>
                Deskripsi (opsional)
              </label>
              <input
                id="purna-link-desc"
                type="text"
                className={inputClass}
                placeholder="Ringkasan singkat link"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                maxLength={200}
                disabled={saving}
              />
            </div>

            {draft.url.startsWith('http') && (
              <a
                href={draft.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-bento-primary"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Pratinjau link
              </a>
            )}

            <button type="submit" disabled={saving} className="w-full scout-btn-primary py-3 text-sm mt-2">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingId ? (
                <>
                  <Pencil className="w-4 h-4" />
                  Simpan Perubahan
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Tambah Link
                </>
              )}
            </button>
          </form>
        </div>

        {/* Kanan: daftar link */}
        <div className="scout-card p-4 sm:p-6 flex flex-col min-h-[280px] lg:min-h-[420px]">
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-bento-border">
            <h4 className="text-sm font-bold text-bento-text">Daftar Link</h4>
            <span className="text-xs font-semibold text-bento-muted">{links.length} link</span>
          </div>

          {links.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-bento-muted text-sm">
              <FileText className="w-10 h-10 stroke-1 mb-3 opacity-30" />
              <p>Belum ada link. Tambahkan dari form tambah link.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-0.5">
              {links.map((link, index) => (
                <div
                  key={link.id}
                  className={`scout-member-card space-y-2 ${
                    editingId === link.id ? 'ring-2 ring-bento-primary/30 border-bento-primary/40' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-bento-muted">
                        Link #{index + 1}
                      </p>
                      <p className="text-sm font-bold text-bento-text truncate mt-0.5">{link.title}</p>
                      {link.description && (
                        <p className="text-xs text-bento-muted mt-1 line-clamp-2">{link.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEdit(link)}
                        disabled={saving}
                        className="p-2 rounded-lg text-bento-primary bg-bento-highlight border border-bento-border"
                        aria-label="Ubah link"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(link.id)}
                        disabled={saving}
                        className="p-2 rounded-lg text-rose-700 bg-rose-50 border border-rose-100"
                        aria-label="Hapus link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] font-mono text-bento-muted truncate bg-bento-soft rounded-lg px-2.5 py-1.5">
                    {link.url}
                  </p>

                  {link.url.startsWith('http') && (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-bento-primary"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Buka link
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
