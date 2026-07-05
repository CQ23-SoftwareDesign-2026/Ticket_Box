"use client";

import { Plus } from "lucide-react";
import { useAdminUsers } from "./_hooks/useAdminUsers";
import { UserStatsCards } from "./_components/UserStatsCards";
import { UserFilterBar } from "./_components/UserFilterBar";
import { UserTable } from "./_components/UserTable";
import { UserDetailDrawer } from "./_components/UserDetailDrawer";
import { CreateUserModal } from "./_components/CreateUserModal";

export default function AdminUsersPage() {
  const {
    search,
    setSearch,
    status,
    setStatus,
    role,
    setRole,
    page,
    setPage,
    itemsPerPage,
    users,
    totalItems,
    isLoading,
    stats,
    totalPages,
    selectedUserId,
    setSelectedUserId,
    detailData,
    setDetailData,
    isDetailLoading,
    draftStatus,
    setDraftStatus,
    draftRoles,
    setDraftRoles,
    isSavingDraft,
    isCreateModalOpen,
    setIsCreateModalOpen,
    newEmail,
    setNewEmail,
    newFullName,
    setNewFullName,
    newPassword,
    setNewPassword,
    newRoles,
    setNewRoles,
    newStatus,
    setNewStatus,
    createError,
    isCreating,
    handleCreateUser,
    handleSaveChanges,
  } = useAdminUsers();

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            User Management
          </h1>
          <p className="text-muted-foreground font-body text-sm mt-1">
            Manage user accounts, update security roles, and view purchase
            history
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-primary hover:bg-primary-container text-white font-body text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 duration-200"
        >
          <Plus className="w-4 h-4" /> Create User
        </button>
      </div>

      <UserStatsCards stats={stats} />

      <UserFilterBar
        search={search}
        status={status}
        role={role}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        onStatusChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        onRoleChange={(v) => {
          setRole(v);
          setPage(1);
        }}
      />

      <UserTable
        users={users}
        isLoading={isLoading}
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        itemsPerPage={itemsPerPage}
        onPageChange={setPage}
        onViewDetail={setSelectedUserId}
      />

      <UserDetailDrawer
        selectedUserId={selectedUserId}
        detailData={detailData}
        isDetailLoading={isDetailLoading}
        draftStatus={draftStatus}
        draftRoles={draftRoles}
        isSavingDraft={isSavingDraft}
        onClose={() => {
          setSelectedUserId(null);
          setDetailData(null);
        }}
        onDraftStatusChange={setDraftStatus}
        onDraftRolesChange={setDraftRoles}
        onCancelDraft={() => {
          if (detailData) {
            setDraftStatus(detailData.status);
            setDraftRoles(detailData.roles);
          }
        }}
        onSaveChanges={handleSaveChanges}
      />

      <CreateUserModal
        isOpen={isCreateModalOpen}
        newFullName={newFullName}
        newEmail={newEmail}
        newPassword={newPassword}
        newRoles={newRoles}
        newStatus={newStatus}
        createError={createError}
        isCreating={isCreating}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUser}
        onFullNameChange={setNewFullName}
        onEmailChange={setNewEmail}
        onPasswordChange={setNewPassword}
        onRolesChange={setNewRoles}
        onStatusChange={setNewStatus}
      />
    </div>
  );
}
