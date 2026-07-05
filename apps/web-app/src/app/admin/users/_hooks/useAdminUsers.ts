"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getAdminUsers,
  createAdminUser,
  getAdminUserDetail,
  updateAdminUserStatus,
  updateAdminUserRoles,
  type AdminUserListItem,
  type AdminUserDetail,
} from "@/services/admin-user.service";

export function useAdminUsers() {
  // Filter States
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [role, setRole] = useState("All");
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // Data States
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    admin: 0,
    blocked: 0,
  });

  // Drawer States
  const [selectedUserId, setSelectedUserIdState] = useState<string | null>(
    null,
  );
  const [detailData, setDetailData] = useState<AdminUserDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Status/Role draft states
  const [draftStatus, setDraftStatus] = useState("");
  const [draftRoles, setDraftRoles] = useState<string[]>([]);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  const setSelectedUserId = useCallback((id: string | null) => {
    setSelectedUserIdState(id);
    if (!id) {
      setDetailData(null);
      setDraftStatus("");
      setDraftRoles([]);
    }
  }, []);

  // Create Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoles, setNewRoles] = useState<string[]>(["Audience"]);
  const [newStatus, setNewStatus] = useState("ACTIVE");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Fetch Stats
  const fetchStatsData = useCallback(async () => {
    try {
      const [totalRes, activeRes, adminRes, inactiveRes, bannedRes] =
        await Promise.all([
          getAdminUsers({ limit: 1 }),
          getAdminUsers({ limit: 1, status: "ACTIVE" }),
          getAdminUsers({ limit: 1, role: "Admin" }),
          getAdminUsers({ limit: 1, status: "INACTIVE" }),
          getAdminUsers({ limit: 1, status: "BANNED" }),
        ]);
      setStats({
        total: totalRes.meta.totalItems,
        active: activeRes.meta.totalItems,
        admin: adminRes.meta.totalItems,
        blocked: inactiveRes.meta.totalItems + bannedRes.meta.totalItems,
      });
    } catch (err) {
      console.error("Failed to fetch user statistics:", err);
    }
  }, []);

  // Fetch Users List
  const fetchUsersData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await getAdminUsers({
        page,
        limit: itemsPerPage,
        status,
        role,
        search,
      });
      setUsers(res.items || []);
      setTotalItems(res.meta.totalItems);
    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, status, role, search]);

  // Initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchUsersData();
      void fetchStatsData();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchUsersData, fetchStatsData]);

  // Fetch Detail on ID change
  useEffect(() => {
    if (!selectedUserId) return;
    const fetchDetail = async () => {
      try {
        setIsDetailLoading(true);
        const res = await getAdminUserDetail(selectedUserId);
        setDetailData(res);
        setDraftStatus(res.status);
        setDraftRoles(res.roles);
      } catch (err) {
        console.error("Failed to fetch user detail:", err);
      } finally {
        setIsDetailLoading(false);
      }
    };
    void fetchDetail();
  }, [selectedUserId]);

  // Handlers
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    if (!newEmail || !newFullName || !newPassword) {
      setCreateError("Please fill in all required fields.");
      return;
    }
    try {
      setIsCreating(true);
      await createAdminUser({
        email: newEmail,
        full_name: newFullName,
        password: newPassword,
        roles: newRoles,
        status: newStatus,
      });
      setIsCreateModalOpen(false);
      setNewEmail("");
      setNewFullName("");
      setNewPassword("");
      setNewRoles(["Audience"]);
      setNewStatus("ACTIVE");
      void fetchUsersData();
      void fetchStatsData();
    } catch (err: unknown) {
      setCreateError(
        err instanceof Error
          ? err.message
          : "Failed to create user. Please try again.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!detailData) return;
    try {
      setIsSavingDraft(true);
      const statusChanged = draftStatus !== detailData.status;
      const rolesChanged =
        JSON.stringify([...draftRoles].sort()) !==
        JSON.stringify([...detailData.roles].sort());
      if (statusChanged)
        await updateAdminUserStatus(detailData.id, draftStatus);
      if (rolesChanged) await updateAdminUserRoles(detailData.id, draftRoles);
      const updatedDetail = await getAdminUserDetail(detailData.id);
      setDetailData(updatedDetail);
      setDraftStatus(updatedDetail.status);
      setDraftRoles(updatedDetail.roles);
      void fetchUsersData();
      void fetchStatsData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save user updates");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;

  return {
    // Filters
    search,
    setSearch,
    status,
    setStatus,
    role,
    setRole,
    page,
    setPage,
    itemsPerPage,
    // Data
    users,
    totalItems,
    isLoading,
    stats,
    totalPages,
    // Drawer
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
    // Create Modal
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
    // Actions
    handleCreateUser,
    handleSaveChanges,
  };
}
