import React, { useState } from 'react';
import { Users, Shield, Award, Link2 } from 'lucide-react';
import { TabNav } from '../ui/TabNav';
import { MemberDirectory } from '../MemberDirectory';
import { PurnaApplicationsPanel } from '../PurnaApplicationsPanel';
import { PurnaLinksSettings } from '../PurnaLinksSettings';
import { MemberCrudModal } from './MemberCrudModal';
import { filterUsersByRole } from '../../lib/filterUsers';
import { UserProfile, UserRole, UserStatus } from '../../types';
import { db, handleFirestoreError } from '../../lib/firebase';
import { doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { OperationType } from '../../types';

export type AdminKelolaTab = 'crud_anggota' | 'crud_pembina' | 'crud_purna' | 'purna_docs';

interface AdminKelolaPageProps {
  tab: AdminKelolaTab;
  onTabChange: (tab: AdminKelolaTab) => void;
  users: UserProfile[];
  loadingMembers: boolean;
}

export function AdminKelolaPage({ tab, onTabChange, users, loadingMembers }: AdminKelolaPageProps) {
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formClass, setFormClass] = useState('');
  const [formSquad, setFormSquad] = useState('');
  const [formRole, setFormRole] = useState<UserRole>(UserRole.ANGGOTA);
  const [formStatus, setFormStatus] = useState<UserStatus>(UserStatus.AKTIF);
  const [formError, setFormError] = useState<string | null>(null);
  const [formContextRole, setFormContextRole] = useState<UserRole>(UserRole.ANGGOTA);
  const [memberSearchAnggota, setMemberSearchAnggota] = useState('');
  const [memberSearchPembina, setMemberSearchPembina] = useState('');
  const [memberFilterRegu, setMemberFilterRegu] = useState('ALL');
  const [memberFilterKelas, setMemberFilterKelas] = useState('ALL');

  const anggotaUsers = users.filter((u) => u.role === UserRole.ANGGOTA);
  const uniqueRegus = Array.from(new Set(anggotaUsers.map((u) => (u.regu ?? '').toUpperCase()))).filter(Boolean);
  const uniqueClasses = Array.from(new Set(anggotaUsers.map((u) => (u.kelas ?? '').toUpperCase()))).filter(Boolean);

  const filteredAnggota = filterUsersByRole(
    users,
    UserRole.ANGGOTA,
    memberSearchAnggota,
    memberFilterRegu,
    memberFilterKelas,
    true
  );

  const filteredPembina = filterUsersByRole(
    users,
    UserRole.ADMIN,
    memberSearchPembina,
    'ALL',
    'ALL',
    false
  );

  const handleOpenCreateModal = (role: UserRole) => {
    setIsEditMode(false);
    setSelectedMemberId(null);
    setFormName('');
    setFormEmail('');
    setFormClass(role === UserRole.ADMIN ? 'Pembina' : role === UserRole.PURNA ? 'Purna' : '');
    setFormSquad(role === UserRole.ADMIN ? 'Staf' : role === UserRole.PURNA ? 'Alumni' : '');
    setFormRole(role);
    setFormContextRole(role);
    setFormStatus(UserStatus.AKTIF);
    setFormError(null);
    setShowMemberModal(true);
  };

  const handleOpenEditModal = (member: UserProfile) => {
    setIsEditMode(true);
    setSelectedMemberId(member.userId);
    setFormName(member.nama);
    setFormEmail(member.email);
    setFormClass(member.kelas);
    setFormSquad(member.regu);
    setFormRole(member.role);
    setFormContextRole(member.role);
    setFormStatus(member.status);
    setFormError(null);
    setShowMemberModal(true);
  };

  const handleFormRoleChange = (role: UserRole) => {
    setFormRole(role);
    setFormContextRole(role);
    if (role === UserRole.ADMIN && (!formClass.trim() || formClass === 'Purna')) {
      setFormClass('Pembina');
    }
    if (role === UserRole.ADMIN && (!formSquad.trim() || formSquad === 'Alumni')) {
      setFormSquad('Staf');
    }
    if (role === UserRole.PURNA) {
      setFormClass('Purna');
      setFormSquad('Alumni');
    }
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Format email tidak valid.');
      return;
    }

    const isPurnaCreate = !isEditMode && formContextRole === UserRole.PURNA;
    const isPurnaEdit = isEditMode && formRole === UserRole.PURNA;
    const resolvedName = formName.trim() || formEmail.trim().split('@')[0];
    const resolvedClass = formClass.trim() || (formRole === UserRole.PURNA ? 'Purna' : '');
    const resolvedSquad = formSquad.trim() || (formRole === UserRole.PURNA ? 'Alumni' : '');

    if (!isPurnaCreate && !isPurnaEdit && (!resolvedName || !resolvedClass || !resolvedSquad)) {
      setFormError('Semua input wajib diisi.');
      return;
    }

    try {
      const emailKey = formEmail.trim().toLowerCase();

      if (isEditMode && selectedMemberId) {
        const userRef = doc(db, 'users', selectedMemberId);
        const existingData = users.find((u) => u.userId === selectedMemberId);
        await setDoc(userRef, {
          ...existingData,
          userId: selectedMemberId,
          nama: resolvedName,
          email: emailKey,
          kelas: resolvedClass,
          regu: resolvedSquad,
          status: formStatus,
          role: formRole,
          createdAt: existingData?.createdAt || serverTimestamp(),
        });
      } else {
        await setDoc(doc(db, 'pre_registered', emailKey), {
          nama: resolvedName,
          email: emailKey,
          kelas: resolvedClass,
          regu: resolvedSquad,
          status: formStatus,
          role: formRole,
          createdAt: serverTimestamp(),
        });
      }

      setShowMemberModal(false);
    } catch (err: unknown) {
      console.error(err);
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan data.');
    }
  };

  const handleDeleteMember = async (userId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data anggota pramuka ini?')) return;
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const nextStatus = user.status === UserStatus.AKTIF ? UserStatus.NON_AKTIF : UserStatus.AKTIF;
    try {
      await updateDoc(doc(db, 'users', user.userId), { status: nextStatus });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.userId}`);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <header className="scout-card px-4 py-4 sm:px-6 sm:py-5">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-bento-muted">
          Manajemen Pengguna
        </p>
        <h1 className="text-lg sm:text-xl font-bold text-bento-text mt-1">Kelola Anggota</h1>
        <p className="text-xs sm:text-sm text-bento-muted mt-1">
          Anggota, pembina, validasi purna, dan link dokumentasi.
        </p>
      </header>

      <TabNav
        tabs={[
          { id: 'admin-kelola-anggota', key: 'crud_anggota', label: 'Anggota', icon: Users },
          { id: 'admin-kelola-pembina', key: 'crud_pembina', label: 'Pembina', icon: Shield },
          { id: 'admin-kelola-purna', key: 'crud_purna', label: 'Purna', icon: Award },
          { id: 'admin-kelola-links', key: 'purna_docs', label: 'Link Purna', icon: Link2 },
        ]}
        active={tab}
        onChange={onTabChange}
        columns={4}
      />

      {tab === 'crud_anggota' && (
        <MemberDirectory
          role={UserRole.ANGGOTA}
          members={filteredAnggota}
          loading={loadingMembers}
          search={memberSearchAnggota}
          onSearchChange={setMemberSearchAnggota}
          filterRegu={memberFilterRegu}
          onFilterReguChange={setMemberFilterRegu}
          filterKelas={memberFilterKelas}
          onFilterKelasChange={setMemberFilterKelas}
          uniqueRegus={uniqueRegus}
          uniqueClasses={uniqueClasses}
          onAdd={() => handleOpenCreateModal(UserRole.ANGGOTA)}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteMember}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {tab === 'crud_pembina' && (
        <MemberDirectory
          role={UserRole.ADMIN}
          members={filteredPembina}
          loading={loadingMembers}
          search={memberSearchPembina}
          onSearchChange={setMemberSearchPembina}
          filterRegu="ALL"
          onFilterReguChange={() => {}}
          filterKelas="ALL"
          onFilterKelasChange={() => {}}
          uniqueRegus={[]}
          uniqueClasses={[]}
          onAdd={() => handleOpenCreateModal(UserRole.ADMIN)}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteMember}
          onToggleStatus={handleToggleStatus}
        />
      )}

      {tab === 'crud_purna' && <PurnaApplicationsPanel />}

      {tab === 'purna_docs' && <PurnaLinksSettings />}

      {showMemberModal && (
        <MemberCrudModal
          isEditMode={isEditMode}
          formContextRole={formContextRole}
          formName={formName}
          formEmail={formEmail}
          formClass={formClass}
          formSquad={formSquad}
          formStatus={formStatus}
          formRole={formRole}
          formError={formError}
          onClose={() => setShowMemberModal(false)}
          onSubmit={handleSaveMember}
          onFormNameChange={setFormName}
          onFormEmailChange={setFormEmail}
          onFormClassChange={setFormClass}
          onFormSquadChange={setFormSquad}
          onFormStatusChange={setFormStatus}
          onFormRoleChange={handleFormRoleChange}
        />
      )}
    </div>
  );
}
