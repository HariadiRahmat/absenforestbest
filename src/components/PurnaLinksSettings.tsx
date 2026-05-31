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
  Save,
  Loader2,
  GripVertical,
  ExternalLink,
} from 'lucide-react';
import { db, logFirestoreError } from '../lib/firebase';
import { OperationType, PurnaDocumentationLink } from '../types';
import { emptyPurnaLinksConfig, newPurnaLink, normalizePurnaLinks } from '../lib/purnaLinks';
import { Alert } from './ui/Alert';

export function PurnaLinksSettings() {
  const [links, setLinks] = useState<PurnaDocumentationLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = doc(db, 'settings', 'purna_links');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setLinks(normalizePurnaLinks(snap.data() as Record<string, unknown>).links);
        } else {
          setLinks(emptyPurnaLinksConfig().links);
        }
      },
      (err) => {
        logFirestoreError(err, OperationType.GET, 'settings/purna_links');
        setError('Gagal memuat link dokumentasi.');
      }
    );
    return () => unsub();
  }, []);

  const updateLink = (id: string, patch: Partial<PurnaDocumentationLink>) => {
    setLinks((prev) => prev.map((link) => (link.id === id ? { ...link, ...patch } : link)));
  };

  const addLink = () => {
    setLinks((prev) => [...prev, newPurnaLink(prev.length)]);
  };

  const removeLink = (id: string) => {
    setLinks((prev) => prev.filter((link) => link.id !== id).map((link, i) => ({ ...link, order: i })));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveOk(false);

    const cleaned = links
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
        setError(`URL "${link.title}" harus diawali http:// atau https://`);
        setSaving(false);
        return;
      }
    }

    try {
      await setDoc(
        doc(db, 'settings', 'purna_links'),
        { links: cleaned, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setLinks(cleaned);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch {
      setError('Gagal menyimpan link. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 border border-bento-border rounded-xl text-sm bg-bento-soft focus:outline-none focus:ring-2 focus:ring-bento-primary/30';
  const labelClass = 'text-[10px] font-semibold text-bento-muted uppercase tracking-wide';

  return (
    <div className="scout-card p-4 sm:p-6 w-full max-w-2xl">
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

      {error && <Alert variant="error" title="Perhatian" message={error} className="mb-4" onDismiss={() => setError(null)} />}
      {saveOk && <Alert variant="success" title="Tersimpan" message="Link dokumentasi berhasil diperbarui." className="mb-4" />}

      <form onSubmit={handleSave} className="space-y-4">
        {links.length === 0 ? (
          <div className="text-center py-10 text-bento-muted text-sm">
            <Link2 className="w-10 h-10 stroke-1 mx-auto mb-3 opacity-30" />
            <p>Belum ada link. Tambahkan dokumentasi kegiatan untuk Purna.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link, index) => (
              <div key={link.id} className="scout-member-card space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-bento-muted">
                    <GripVertical className="w-4 h-4" />
                    <span className="text-xs font-semibold">Link #{index + 1}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLink(link.id)}
                    className="p-2 rounded-lg text-rose-700 bg-rose-50 border border-rose-100"
                    aria-label="Hapus link"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Judul</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Contoh: Arsip Jambore 2024"
                    value={link.title}
                    onChange={(e) => updateLink(link.id, { title: e.target.value })}
                    maxLength={80}
                  />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>URL</label>
                  <input
                    type="url"
                    className={`${inputClass} font-mono text-xs`}
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => updateLink(link.id, { url: e.target.value })}
                    maxLength={500}
                  />
                </div>

                <div className="space-y-1">
                  <label className={labelClass}>Deskripsi (opsional)</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="Ringkasan singkat link"
                    value={link.description ?? ''}
                    onChange={(e) => updateLink(link.id, { description: e.target.value })}
                    maxLength={200}
                  />
                </div>

                {link.url.startsWith('http') && (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-bento-primary"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Pratinjau link
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        <button type="button" onClick={addLink} className="w-full scout-btn-secondary py-3 text-sm">
          <Plus className="w-4 h-4" />
          Tambah Link
        </button>

        <button type="submit" disabled={saving} className="w-full scout-btn-primary py-3.5 text-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Simpan Link Dokumentasi</>}
        </button>
      </form>
    </div>
  );
}
