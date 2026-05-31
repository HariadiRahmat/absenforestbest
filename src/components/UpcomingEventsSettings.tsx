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
  MapPin,
  Clock,
  Save,
  X,
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

type EventDraft = typeof emptyDraft;

function draftFromEvent(event: UpcomingEvent): EventDraft {
  return {
    title: event.title,
    tanggal: event.tanggal,
    description: event.description ?? '',
    lokasi: event.lokasi ?? '',
    waktu: event.waktu ?? '',
  };
}

function validateDraft(draft: EventDraft): string | null {
  const title = draft.title.trim();
  const tanggal = draft.tanggal.trim();
  if (!title || !tanggal) return 'Judul dan tanggal wajib diisi.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return 'Format tanggal tidak valid.';
  return null;
}

function applyDraft(event: UpcomingEvent, draft: EventDraft): UpcomingEvent {
  return {
    ...event,
    title: draft.title.trim(),
    tanggal: draft.tanggal.trim(),
    description: draft.description.trim(),
    lokasi: draft.lokasi.trim(),
    waktu: draft.waktu.trim(),
  };
}

export function UpcomingEventsSettings() {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [addDraft, setAddDraft] = useState(emptyDraft);
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

  const showSuccess = () => {
    setSaveOk(true);
    setTimeout(() => setSaveOk(false), 3000);
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateDraft(addDraft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSaveOk(false);

    try {
      const nextEvents = [
        ...events,
        applyDraft(newUpcomingEvent(events.length), addDraft),
      ];
      await persistEvents(nextEvents);
      setAddDraft(emptyDraft);
      showSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah kegiatan. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (id: string, draft: EventDraft) => {
    const validationError = validateDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSaveOk(false);

    try {
      const nextEvents = events.map((event) =>
        event.id === id ? applyDraft(event, draft) : event
      );
      await persistEvents(nextEvents);
      setEditingId(null);
      showSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan perubahan.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus kegiatan ini?')) return;

    setSaving(true);
    setError(null);
    setSaveOk(false);

    try {
      const nextEvents = events.filter((event) => event.id !== id);
      await persistEvents(nextEvents);
      if (editingId === id) setEditingId(null);
      showSuccess();
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
      {error && <Alert variant="error" title="Perhatian" message={error} onDismiss={() => setError(null)} />}
      {saveOk && <Alert variant="success" title="Tersimpan" message="Kegiatan berhasil diperbarui." />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 items-start">
        <div className="scout-card p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-bento-border">
            <h4 className="text-sm font-bold text-bento-text">Tambah Kegiatan Baru</h4>
          </div>

          <form onSubmit={handleAddEvent} className="space-y-3.5">
            <EventFormFields
              draft={addDraft}
              onChange={setAddDraft}
              saving={saving}
              inputClass={inputClass}
              labelClass={labelClass}
              idPrefix="add"
            />

            <button type="submit" disabled={saving} className="w-full scout-btn-primary py-3 text-sm mt-2">
              {saving && !editingId ? (
                <Loader2 className="w-4 h-4 animate-spin" />
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
            <div className="flex items-center gap-2">
              {upcomingCount > 0 && <span className="scout-count-badge">{upcomingCount}</span>}
              <span className="text-xs font-semibold text-bento-muted">{events.length} kegiatan</span>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-bento-muted text-sm">
              <Calendar className="w-10 h-10 stroke-1 mb-3 opacity-30" />
              <p>Belum ada kegiatan. Tambahkan dari form di sebelah kiri.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-0.5">
              {events.map((event) => (
                <EventListRow
                  key={event.id}
                  event={event}
                  todayStr={todayStr}
                  isEditing={editingId === event.id}
                  saving={saving}
                  inputClass={inputClass}
                  labelClass={labelClass}
                  onStartEdit={() => {
                    setEditingId(event.id);
                    setError(null);
                  }}
                  onCancelEdit={() => setEditingId(null)}
                  onSave={(draft) => handleSaveEdit(event.id, draft)}
                  onDelete={() => handleDelete(event.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EventFormFields({
  draft,
  onChange,
  saving,
  inputClass,
  labelClass,
  idPrefix,
}: {
  draft: EventDraft;
  onChange: (draft: EventDraft) => void;
  saving: boolean;
  inputClass: string;
  labelClass: string;
  idPrefix: string;
}) {
  return (
    <>
      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-event-title`} className={labelClass}>
          Judul Kegiatan
        </label>
        <input
          id={`${idPrefix}-event-title`}
          type="text"
          className={inputClass}
          placeholder="Contoh: Upacara 17 Agustus"
          value={draft.title}
          onChange={(e) => onChange({ ...draft, title: e.target.value })}
          maxLength={100}
          disabled={saving}
        />
      </div>

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-event-tanggal`} className={labelClass}>
          Tanggal
        </label>
        <input
          id={`${idPrefix}-event-tanggal`}
          type="date"
          className={`${inputClass} scout-date-input`}
          value={draft.tanggal}
          onChange={(e) => onChange({ ...draft, tanggal: e.target.value })}
          disabled={saving}
          required
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-event-waktu`} className={labelClass}>
            Waktu (opsional)
          </label>
          <input
            id={`${idPrefix}-event-waktu`}
            type="text"
            className={inputClass}
            placeholder="07.00 WIB"
            value={draft.waktu}
            onChange={(e) => onChange({ ...draft, waktu: e.target.value })}
            maxLength={30}
            disabled={saving}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor={`${idPrefix}-event-lokasi`} className={labelClass}>
            Lokasi (opsional)
          </label>
          <input
            id={`${idPrefix}-event-lokasi`}
            type="text"
            className={inputClass}
            placeholder="Lapangan latihan"
            value={draft.lokasi}
            onChange={(e) => onChange({ ...draft, lokasi: e.target.value })}
            maxLength={120}
            disabled={saving}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label htmlFor={`${idPrefix}-event-desc`} className={labelClass}>
          Deskripsi (opsional)
        </label>
        <textarea
          id={`${idPrefix}-event-desc`}
          className={`${inputClass} min-h-[80px] resize-y`}
          placeholder="Catatan singkat untuk anggota"
          value={draft.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
          maxLength={300}
          disabled={saving}
        />
      </div>
    </>
  );
}

function EventListRow({
  event,
  todayStr,
  isEditing,
  saving,
  inputClass,
  labelClass,
  onStartEdit,
  onCancelEdit,
  onSave,
  onDelete,
}: {
  event: UpcomingEvent;
  todayStr: string;
  isEditing: boolean;
  saving: boolean;
  inputClass: string;
  labelClass: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: (draft: EventDraft) => void;
  onDelete: () => void;
}) {
  const [editDraft, setEditDraft] = useState(() => draftFromEvent(event));

  useEffect(() => {
    if (isEditing) {
      setEditDraft(draftFromEvent(event));
    }
  }, [isEditing, event]);

  const daysLeft = daysUntilEvent(event.tanggal, todayStr);
  const isPast = daysLeft < 0;
  const proximity = getEventProximity(event.tanggal, todayStr);

  if (isEditing) {
    return (
      <div className="scout-member-card space-y-3 ring-2 ring-bento-primary/30 border-bento-primary/40">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wide text-bento-primary">Ubah Kegiatan</p>
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={saving}
            className="inline-flex items-center gap-1 text-xs font-semibold text-bento-muted hover:text-bento-text"
          >
            <X className="w-3.5 h-3.5" />
            Batal
          </button>
        </div>

        <EventFormFields
          draft={editDraft}
          onChange={setEditDraft}
          saving={saving}
          inputClass={inputClass}
          labelClass={labelClass}
          idPrefix={`edit-${event.id}`}
        />

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onCancelEdit}
            disabled={saving}
            className="flex-1 scout-btn-secondary py-2.5 text-xs"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onSave(editDraft)}
            disabled={saving}
            className="flex-1 scout-btn-primary py-2.5 text-xs"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Simpan
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`scout-member-card space-y-2 ${isPast ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold text-bento-text truncate">{event.title}</p>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                isPast ? 'bg-slate-100 text-slate-500 border-slate-200' : proximity.badgeClass
              }`}
            >
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
      </div>

      <div className="flex gap-2 pt-1 border-t border-bento-border">
        <button
          type="button"
          onClick={onStartEdit}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-bento-primary bg-bento-highlight border border-bento-border"
        >
          <Pencil className="w-3.5 h-3.5" />
          Ubah
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-100"
          aria-label="Hapus kegiatan"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
