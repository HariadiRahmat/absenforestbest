/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Calendar,
  Plus,
  Trash2,
  Loader2,
  Pencil,
  X,
  MapPin,
  Clock,
} from 'lucide-react';
import { db, logFirestoreError } from '../lib/firebase';
import { OperationType, UpcomingEvent } from '../types';
import {
  daysUntilEvent,
  formatEventDateLong,
  getEventProximity,
  newUpcomingEvent,
  resolveUpcomingEvents,
  sortUpcomingEvents,
} from '../lib/upcomingEvents';
import { getTodayStr } from '../lib/dateUtils';
import { Alert } from './ui/Alert';

const emptyDraft = { title: '', tanggal: '', description: '', lokasi: '', waktu: '' };

export function UpcomingEventsSettings() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ref = doc(db, 'settings', 'upcoming_events');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const config = snap.exists()
          ? resolveUpcomingEvents(snap.data() as Record<string, unknown>)
          : resolveUpcomingEvents();
        setEvents(sortUpcomingEvents(config.events));
      },
      (err) => {
        logFirestoreError(err, OperationType.GET, 'settings/upcoming_events');
        setError('Gagal memuat kegiatan mendatang.');
      }
    );
    return () => unsub();
  }, []);

  const persistEvents = async (nextEvents: UpcomingEvent[]) => {
    const cleaned = nextEvents
      .map((event, index) => ({
        ...event,
        title: event.title.trim(),
        tanggal: event.tanggal.trim(),
        description: event.description?.trim() || '',
        lokasi: event.lokasi?.trim() || '',
        waktu: event.waktu?.trim() || '',
        order: index,
      }))
      .filter((event) => event.title && /^\d{4}-\d{2}-\d{2}$/.test(event.tanggal));

    await setDoc(
      doc(db, 'settings', 'upcoming_events'),
      { events: cleaned, updatedAt: serverTimestamp() },
      { merge: true }
    );
    setEvents(sortUpcomingEvents(cleaned));
  };

  const resetDraft = () => {
    setDraft(emptyDraft);
    setEditingId(null);
  };

  const handleSubmitDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = draft.title.trim();
    const tanggal = draft.tanggal.trim();
    const description = draft.description.trim();
    const lokasi = draft.lokasi.trim();
    const waktu = draft.waktu.trim();

    if (!title || !tanggal) {
      setError('Judul dan tanggal wajib diisi.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
      setError('Format tanggal tidak valid.');
      return;
    }

    setSaving(true);
    setError(null);
    setSaveOk(false);

    try {
      let nextEvents: UpcomingEvent[];

      if (editingId) {
        nextEvents = events.map((event) =>
          event.id === editingId
            ? { ...event, title, tanggal, description, lokasi, waktu }
            : event
        );
      } else {
        nextEvents = [
          ...events,
          { ...newUpcomingEvent(events.length), title, tanggal, description, lokasi, waktu },
        ];
      }

      await persistEvents(nextEvents);
      resetDraft();
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan kegiatan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (event: UpcomingEvent) => {
    setDraft({
      title: event.title,
      tanggal: event.tanggal,
      description: event.description ?? '',
      lokasi: event.lokasi ?? '',
      waktu: event.waktu ?? '',
    });
    setEditingId(event.id);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus kegiatan ini?')) return;

    setSaving(true);
    setError(null);
    setSaveOk(false);

    try {
      const nextEvents = events.filter((event) => event.id !== id);
      await persistEvents(nextEvents);
      if (editingId === id) resetDraft();
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus kegiatan.');
    } finally {
      setSaving(false);
    }
  };

  const todayStr = getTodayStr();
  const upcomingCount = events.filter((e) => e.tanggal >= todayStr).length;

  const inputClass =
    'w-full px-3.5 py-2.5 border border-bento-border rounded-xl text-sm bg-bento-soft focus:outline-none focus:ring-2 focus:ring-bento-primary/30';
  const labelClass = 'text-[10px] font-semibold text-bento-muted uppercase tracking-wide';

  return (
    <div className="w-full max-w-6xl space-y-4">
      <div className="scout-card p-4 sm:p-6">
        <div className="scout-section-head">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-bento-accent flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-bento-dark" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-bento-text">Kegiatan Mendatang</h3>
              <p className="text-xs sm:text-sm text-bento-muted mt-0.5 leading-relaxed">
                Buat jadwal kegiatan pramuka yang akan tampil di halaman Anggota dan Purna.
              </p>
            </div>
          </div>
          {upcomingCount > 0 && <span className="scout-count-badge">{upcomingCount}</span>}
        </div>
      </div>

      {error && <Alert variant="error" title="Perhatian" message={error} onDismiss={() => setError(null)} />}
      {saveOk && <Alert variant="success" title="Tersimpan" message="Kegiatan berhasil diperbarui." />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        <div className="scout-card p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-bento-border">
            <h4 className="text-sm font-bold text-bento-text">
              {editingId ? 'Ubah Kegiatan' : 'Tambah Kegiatan Baru'}
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
              <label htmlFor="event-title" className={labelClass}>
                Judul Kegiatan
              </label>
              <input
                id="event-title"
                type="text"
                className={inputClass}
                placeholder="Contoh: Upacara 17 Agustus"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                maxLength={100}
                disabled={saving}
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="event-tanggal" className={labelClass}>
                Tanggal
              </label>
              <input
                id="event-tanggal"
                type="date"
                className={`${inputClass} scout-date-input`}
                value={draft.tanggal}
                onChange={(e) => setDraft({ ...draft, tanggal: e.target.value })}
                disabled={saving}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="event-waktu" className={labelClass}>
                  Waktu (opsional)
                </label>
                <input
                  id="event-waktu"
                  type="text"
                  className={inputClass}
                  placeholder="07.00 WIB"
                  value={draft.waktu}
                  onChange={(e) => setDraft({ ...draft, waktu: e.target.value })}
                  maxLength={30}
                  disabled={saving}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="event-lokasi" className={labelClass}>
                  Lokasi (opsional)
                </label>
                <input
                  id="event-lokasi"
                  type="text"
                  className={inputClass}
                  placeholder="Lapangan latihan"
                  value={draft.lokasi}
                  onChange={(e) => setDraft({ ...draft, lokasi: e.target.value })}
                  maxLength={120}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="event-desc" className={labelClass}>
                Deskripsi (opsional)
              </label>
              <textarea
                id="event-desc"
                className={`${inputClass} min-h-[80px] resize-y`}
                placeholder="Catatan singkat untuk anggota"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                maxLength={300}
                disabled={saving}
              />
            </div>

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
                  Tambah Kegiatan
                </>
              )}
            </button>
          </form>
        </div>

        <div className="scout-card p-4 sm:p-6 flex flex-col min-h-[280px] lg:min-h-[420px]">
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-bento-border">
            <h4 className="text-sm font-bold text-bento-text">Daftar Kegiatan</h4>
            <span className="text-xs font-semibold text-bento-muted">{events.length} kegiatan</span>
          </div>

          {events.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-bento-muted text-sm">
              <Calendar className="w-10 h-10 stroke-1 mb-3 opacity-30" />
              <p>Belum ada kegiatan. Tambahkan dari form di sebelah kiri.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-0.5">
              {events.map((event) => {
                const daysLeft = daysUntilEvent(event.tanggal, todayStr);
                const isPast = daysLeft < 0;
                const proximity = getEventProximity(event.tanggal, todayStr);

                return (
                  <div
                    key={event.id}
                    className={`scout-member-card space-y-2 ${
                      editingId === event.id ? 'ring-2 ring-bento-primary/30 border-bento-primary/40' : ''
                    } ${isPast ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-bento-text truncate">{event.title}</p>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${isPast ? 'bg-slate-100 text-slate-500 border-slate-200' : proximity.badgeClass}`}>
                            {isPast ? 'Lewat' : proximity.label}
                          </span>
                        </div>
                        <p className="text-xs text-bento-muted mt-1 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          {formatEventDateLong(event.tanggal)}
                        </p>
                        {(event.waktu || event.lokasi) && (
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5 text-[11px] text-bento-muted">
                            {event.waktu && (
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {event.waktu}
                              </span>
                            )}
                            {event.lokasi && (
                              <span className="inline-flex items-center gap-1 truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {event.lokasi}
                              </span>
                            )}
                          </div>
                        )}
                        {event.description && (
                          <p className="text-xs text-bento-muted mt-1.5 line-clamp-2">{event.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEdit(event)}
                          disabled={saving}
                          className="p-2 rounded-lg text-bento-primary bg-bento-highlight border border-bento-border"
                          aria-label="Ubah kegiatan"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(event.id)}
                          disabled={saving}
                          className="p-2 rounded-lg text-rose-700 bg-rose-50 border border-rose-100"
                          aria-label="Hapus kegiatan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
