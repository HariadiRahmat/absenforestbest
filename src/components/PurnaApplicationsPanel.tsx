/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  query,
} from 'firebase/firestore';
import {
  Award,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  MapPin,
  Trash2,
  Loader2,
} from 'lucide-react';
import { db, logFirestoreError } from '../lib/firebase';
import { OperationType, PurnaApprovalStatus, PurnaRegistration, UserRole, UserStatus } from '../types';
import { normalizePurnaRegistration } from '../lib/purnaRegistration';
import { Alert } from './ui/Alert';

export function PurnaApplicationsPanel() {
  const [applications, setApplications] = useState<PurnaRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'purna_registrations'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: PurnaRegistration[] = [];
        snap.forEach((d) => {
          list.push(normalizePurnaRegistration(d.id, d.data() as Record<string, unknown>));
        });
        list.sort((a, b) => (b.submittedAt?.seconds ?? 0) - (a.submittedAt?.seconds ?? 0));
        setApplications(list);
        setLoading(false);
      },
      (err) => {
        logFirestoreError(err, OperationType.LIST, 'purna_registrations');
        setError('Gagal memuat pendaftaran purna.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleApprove = async (app: PurnaRegistration) => {
    setProcessingEmail(app.email);
    setError(null);
    try {
      await setDoc(doc(db, 'pre_registered', app.email), {
        nama: app.nama,
        email: app.email,
        kelas: 'Purna',
        regu: 'Alumni',
        role: UserRole.PURNA,
        status: UserStatus.AKTIF,
        tanggalLahir: app.tanggalLahir,
        alamat: app.alamat,
        agama: app.agama,
        pendidikanSd: app.pendidikanSd,
        pendidikanSmp: app.pendidikanSmp,
        pendidikanSma: app.pendidikanSma,
        pendidikanKuliah: app.pendidikanKuliah ?? '',
        statusPerkawinan: app.statusPerkawinan,
        profileComplete: true,
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, 'purna_registrations', app.email), {
        approvalStatus: PurnaApprovalStatus.APPROVED,
        reviewedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      setError('Gagal menyetujui pendaftaran.');
    } finally {
      setProcessingEmail(null);
    }
  };

  const handleReject = async (app: PurnaRegistration) => {
    if (!window.confirm(`Tolak pendaftaran ${app.nama} (${app.email})?`)) return;
    setProcessingEmail(app.email);
    setError(null);
    try {
      await updateDoc(doc(db, 'purna_registrations', app.email), {
        approvalStatus: PurnaApprovalStatus.REJECTED,
        reviewedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
      setError('Gagal menolak pendaftaran.');
    } finally {
      setProcessingEmail(null);
    }
  };

  const handleDelete = async (app: PurnaRegistration) => {
    if (!window.confirm(`Hapus data pendaftaran ${app.email}?`)) return;
    setProcessingEmail(app.email);
    try {
      await deleteDoc(doc(db, 'purna_registrations', app.email));
    } catch (err) {
      console.error(err);
      setError('Gagal menghapus pendaftaran.');
    } finally {
      setProcessingEmail(null);
    }
  };

  const pending = applications.filter((a) => a.approvalStatus === PurnaApprovalStatus.PENDING);
  const others = applications.filter((a) => a.approvalStatus !== PurnaApprovalStatus.PENDING);

  return (
    <div className="scout-card p-4 sm:p-6">
      <div className="scout-section-head">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-bento-accent flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-bento-dark" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-bento-text">Pendaftaran Purna</h3>
            <p className="text-xs sm:text-sm text-bento-muted mt-0.5 leading-relaxed">
              Tinjau pendaftaran dari landing page. Setujui agar purna bisa login.
            </p>
          </div>
        </div>
        {pending.length > 0 && <span className="scout-count-badge">{pending.length}</span>}
      </div>

      {error && <Alert variant="error" title="Perhatian" message={error} className="mb-4" onDismiss={() => setError(null)} />}

      {loading ? (
        <div className="text-center py-14 text-bento-muted text-sm">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Memuat pendaftaran...
        </div>
      ) : applications.length === 0 ? (
        <div className="text-center py-14 text-bento-muted text-sm">
          <Award className="w-10 h-10 stroke-1 mx-auto mb-3 opacity-30" />
          Belum ada pendaftaran purna masuk.
        </div>
      ) : (
        <div className="space-y-6">
          {pending.length > 0 && (
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-bento-muted mb-3">
                Menunggu Konfirmasi ({pending.length})
              </h4>
              <div className="space-y-3">
                {pending.map((app) => (
                  <ApplicationCard
                    key={app.email}
                    app={app}
                    processing={processingEmail === app.email}
                    onApprove={() => handleApprove(app)}
                    onReject={() => handleReject(app)}
                    onDelete={() => handleDelete(app)}
                  />
                ))}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-bento-muted mb-3">Riwayat</h4>
              <div className="space-y-3">
                {others.map((app) => (
                  <ApplicationCard
                    key={app.email}
                    app={app}
                    processing={processingEmail === app.email}
                    onDelete={() => handleDelete(app)}
                    readonly
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function ApplicationCard({
  app,
  processing,
  onApprove,
  onReject,
  onDelete,
  readonly,
}: {
  app: PurnaRegistration;
  processing: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onDelete?: () => void;
  readonly?: boolean;
}) {
  const statusBadge =
    app.approvalStatus === PurnaApprovalStatus.APPROVED ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-lime-50 text-lime-800 border border-lime-200">
        <CheckCircle className="w-3 h-3" /> Disetujui
      </span>
    ) : app.approvalStatus === PurnaApprovalStatus.REJECTED ? (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-rose-50 text-rose-800 border border-rose-100">
        <XCircle className="w-3 h-3" /> Ditolak
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-100">
        <Clock className="w-3 h-3" /> Pending
      </span>
    );

  return (
    <div className="scout-member-card space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-bento-text truncate">{app.nama}</p>
          <p className="text-[11px] text-bento-muted flex items-center gap-1 mt-0.5 truncate">
            <Mail className="w-3 h-3 shrink-0" />
            {app.email}
          </p>
        </div>
        {statusBadge}
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-bento-muted">
        <span>Lahir: {app.tanggalLahir}</span>
        <span>{app.agama} · {app.statusPerkawinan}</span>
        <span className="col-span-2 flex items-start gap-1">
          <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
          <span className="line-clamp-2">{app.alamat}</span>
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="scout-chip">SD: {app.pendidikanSd}</span>
        <span className="scout-chip">SMP: {app.pendidikanSmp}</span>
        <span className="scout-chip">SMA: {app.pendidikanSma}</span>
        {app.pendidikanKuliah && <span className="scout-chip">Kuliah: {app.pendidikanKuliah}</span>}
      </div>

      {!readonly && onApprove && onReject && (
        <div className="scout-action-row">
          <button type="button" onClick={onApprove} disabled={processing} className="scout-action-btn text-lime-800 bg-lime-50 border-lime-200">
            {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Setujui
          </button>
          <button type="button" onClick={onReject} disabled={processing} className="scout-action-btn scout-action-btn-danger">
            <XCircle className="w-3.5 h-3.5" />
            Tolak
          </button>
        </div>
      )}

      {readonly && onDelete && (
        <button type="button" onClick={onDelete} disabled={processing} className="w-full scout-btn-secondary text-xs py-2">
          <Trash2 className="w-3.5 h-3.5" />
          Hapus Arsip
        </button>
      )}
    </div>
  );
}
