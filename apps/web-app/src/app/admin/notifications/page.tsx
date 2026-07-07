"use client";

import { useState, useEffect, useCallback } from "react";
import { Pagination } from "../_components/Pagination";
import { useToast } from "@/context/ToastContext";
import {
  Mail,
  Smartphone,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Eye,
  Edit2,
  Trash2,
  Plus,
  Loader2,
  X,
  Copy,
  Check,
} from "lucide-react";
import {
  getNotificationLogs,
  getNotificationTemplates,
  createNotificationTemplate,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  getNotificationLogDetail,
  NotificationLog,
  NotificationTemplate,
} from "@/services/admin-notification.service";

export default function NotificationsPage() {
  const { success: toastSuccess, error: toastError } = useToast();

  // Navigation tabs: "logs" | "templates"
  const [activeTab, setActiveTab] = useState<"logs" | "templates">("logs");

  // --- LOGS STATE ---
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logPage, setLogPage] = useState(1);
  const [logLimit, setLogLimit] = useState(10);
  const [logStatus, setLogStatus] = useState("All");
  const [logTemplateCode, setLogTemplateCode] = useState("All");
  const [logSearch, setLogSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);
  const [isLogDetailOpen, setIsLogDetailOpen] = useState(false);

  // --- TEMPLATES STATE ---
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<NotificationTemplate | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Form State for Template
  const [templateCodeForm, setTemplateCodeForm] = useState("");
  const [templateChannelForm, setTemplateChannelForm] = useState("EMAIL");
  const [templateSubjectForm, setTemplateSubjectForm] = useState("");
  const [templateContentForm, setTemplateContentForm] = useState("");

  // Copy state helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(logSearch);
      setLogPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [logSearch]);

  // Load Logs
  const fetchLogs = useCallback(async () => {
    if (activeTab !== "logs") return;
    try {
      setIsLogsLoading(true);
      const res = await getNotificationLogs({
        page: logPage,
        limit: logLimit,
        status: logStatus,
        template_code: logTemplateCode,
        search: debouncedSearch || undefined,
      });
      setLogs(res.data || []);
      setLogTotal(res.meta.totalItems || 0);
    } catch (err: unknown) {
      console.error("Failed to fetch logs:", err);
      toastError("Không thể tải lịch sử thông báo.");
    } finally {
      setIsLogsLoading(false);
    }
  }, [
    activeTab,
    logPage,
    logLimit,
    logStatus,
    logTemplateCode,
    debouncedSearch,
    toastError,
  ]);

  // Load Templates
  const fetchTemplates = useCallback(async () => {
    if (activeTab !== "templates") return;
    try {
      setIsTemplatesLoading(true);
      const res = await getNotificationTemplates();
      setTemplates(res || []);
    } catch (err: unknown) {
      console.error("Failed to fetch templates:", err);
      toastError("Không thể tải danh sách mẫu tin nhắn.");
    } finally {
      setIsTemplatesLoading(false);
    }
  }, [activeTab, toastError]);

  // Effects
  useEffect(() => {
    async function loadLogs() {
      await fetchLogs();
    }
    void loadLogs();
  }, [fetchLogs]);

  useEffect(() => {
    async function loadTemplates() {
      await fetchTemplates();
    }
    void loadTemplates();
  }, [fetchTemplates]);

  // Handle open template edit/create
  const handleOpenTemplateModal = (template?: NotificationTemplate) => {
    if (template) {
      setSelectedTemplate(template);
      setTemplateCodeForm(template.code);
      setTemplateChannelForm(template.channel);
      setTemplateSubjectForm(template.subject);
      setTemplateContentForm(template.content);
    } else {
      setSelectedTemplate(null);
      setTemplateCodeForm("");
      setTemplateChannelForm("EMAIL");
      setTemplateSubjectForm("");
      setTemplateContentForm("");
    }
    setIsTemplateModalOpen(true);
  };

  // Submit template CRUD
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateCodeForm || !templateSubjectForm || !templateContentForm) {
      toastError("Vui lòng điền đầy đủ các trường bắt buộc.");
      return;
    }

    try {
      setIsSavingTemplate(true);
      if (selectedTemplate) {
        // Update
        await updateNotificationTemplate(selectedTemplate.id, {
          channel: templateChannelForm,
          subject: templateSubjectForm,
          content: templateContentForm,
        });
        toastSuccess("Cập nhật mẫu tin nhắn thành công!");
      } else {
        // Create
        await createNotificationTemplate({
          code: templateCodeForm,
          channel: templateChannelForm,
          subject: templateSubjectForm,
          content: templateContentForm,
        });
        toastSuccess("Tạo mẫu tin nhắn thành công!");
      }
      setIsTemplateModalOpen(false);
      void fetchTemplates();
    } catch (err: unknown) {
      console.error("Failed to save template:", err);
      const errMsg =
        err instanceof Error ? err.message : "Không thể lưu mẫu tin nhắn.";
      toastError(errMsg);
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Delete Template
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa mẫu tin nhắn này không?")) return;
    try {
      await deleteNotificationTemplate(id);
      toastSuccess("Xóa mẫu tin nhắn thành công!");
      void fetchTemplates();
    } catch (err: unknown) {
      console.error("Failed to delete template:", err);
      toastError("Không thể xóa mẫu tin nhắn.");
    }
  };

  // View Log detail
  const handleViewLogDetail = async (id: string) => {
    try {
      const log = await getNotificationLogDetail(id);
      setSelectedLog(log);
      setIsLogDetailOpen(true);
    } catch (err: unknown) {
      console.error("Failed to fetch log details:", err);
      toastError("Không thể tải chi tiết log gửi tin.");
    }
  };

  // Copy helper
  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
        <div className="space-y-1">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Thông báo hệ thống
          </h1>
          <p className="text-muted-foreground font-body text-sm">
            Cấu hình các mẫu tin nhắn e-ticket, nhắc nhở tự động và theo dõi
            lịch sử gửi tin.
          </p>
        </div>

        {activeTab === "templates" && (
          <button
            onClick={() => handleOpenTemplateModal()}
            className="bg-primary hover:bg-primary-container text-white font-body text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all active:scale-95 duration-200 cursor-pointer"
          >
            <Plus size={16} /> Thêm mẫu tin nhắn
          </button>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-border select-none">
        <button
          onClick={() => setActiveTab("logs")}
          className={`py-3 px-6 font-display text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "logs"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Lịch sử gửi tin
        </button>
        <button
          onClick={() => setActiveTab("templates")}
          className={`py-3 px-6 font-display text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === "templates"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Mẫu thông báo
        </button>
      </div>

      {/* --- LOGS TAB CONTENT --- */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Logs Filter Bar */}
          <div className="bg-surface rounded-2xl border border-border p-5 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="flex flex-col gap-2 md:col-span-6">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Tìm kiếm log
              </span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, email, mục tiêu nhận..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-border rounded-xl bg-background focus:outline-none focus:border-primary text-xs w-full h-11 transition-all text-foreground"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 md:col-span-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Trạng thái
              </span>
              <select
                value={logStatus}
                onChange={(e) => {
                  setLogStatus(e.target.value);
                  setLogPage(1);
                }}
                className="bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary w-full h-11 cursor-pointer"
              >
                <option value="All">Tất cả trạng thái</option>
                <option value="PENDING">PENDING</option>
                <option value="SENT">SENT</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 md:col-span-3">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Mã tin nhắn
              </span>
              <select
                value={logTemplateCode}
                onChange={(e) => {
                  setLogTemplateCode(e.target.value);
                  setLogPage(1);
                }}
                className="bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-semibold text-foreground focus:outline-none focus:border-primary w-full h-11 cursor-pointer"
              >
                <option value="All">Tất cả mã</option>
                <option value="TICKET_CONFIRMATION">TICKET_CONFIRMATION</option>
                <option value="PAYMENT_SUCCESS">PAYMENT_SUCCESS</option>
                <option value="APP_PAYMENT_SUCCESS">APP_PAYMENT_SUCCESS</option>
                <option value="CONCERT_REMINDER">CONCERT_REMINDER</option>
              </select>
            </div>
          </div>

          {/* Logs Table */}
          <div className="bg-surface border border-border rounded-2xl shadow-sm overflow-hidden">
            {isLogsLoading ? (
              <div className="py-24 text-center text-muted-foreground">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="font-body text-xs">
                    Đang tải lịch sử gửi tin...
                  </span>
                </div>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-24 text-center text-muted-foreground font-body text-xs">
                Không tìm thấy log gửi tin nào phù hợp.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-low/50 font-body text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60">
                      <th className="p-4">Mã log</th>
                      <th className="p-4">Người nhận</th>
                      <th className="p-4">Địa chỉ gửi</th>
                      <th className="p-4">Loại mẫu</th>
                      <th className="p-4 text-center">Kênh</th>
                      <th className="p-4 text-center">Trạng thái</th>
                      <th className="p-4">Thời gian</th>
                      <th className="p-4 text-center">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="font-body divide-y divide-border/40">
                    {logs.map((log) => {
                      const isSent = log.status === "SENT";
                      const isFailed = log.status === "FAILED";

                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-surface-high/10 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold text-foreground">
                                {log.id.substring(0, 8).toUpperCase()}...
                              </span>
                              <button
                                onClick={() => handleCopyId(log.id)}
                                className="text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                              >
                                {copiedId === log.id ? (
                                  <Check
                                    size={12}
                                    className="text-emerald-400"
                                  />
                                ) : (
                                  <Copy size={12} />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-foreground">
                              {log.user?.full_name || "Hệ thống"}
                            </p>
                            <p className="text-muted-foreground text-[10px]">
                              {log.user?.email}
                            </p>
                          </td>
                          <td className="p-4 font-semibold text-foreground font-mono text-xs">
                            {log.target}
                          </td>
                          <td className="p-4 font-bold text-foreground">
                            {log.template?.code || "Không xác định"}
                          </td>
                          <td className="p-4 text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                              {log.template?.channel === "EMAIL" ? (
                                <>
                                  <Mail className="w-3.5 h-3.5 text-blue-400" />{" "}
                                  Mail
                                </>
                              ) : (
                                <>
                                  <Smartphone className="w-3.5 h-3.5 text-violet-400" />{" "}
                                  App
                                </>
                              )}
                            </span>
                          </td>
                          <td className="p-4 text-center select-none">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase ${
                                isSent
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : isFailed
                                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              }`}
                            >
                              {isSent ? (
                                <CheckCircle2 size={10} />
                              ) : isFailed ? (
                                <XCircle size={10} />
                              ) : (
                                <Clock size={10} />
                              )}
                              {log.status}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground text-xs font-medium">
                            {new Date(log.created_at).toLocaleString("vi-VN")}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleViewLogDetail(log.id)}
                              className="p-1.5 hover:bg-surface-high rounded-lg text-primary hover:text-primary-container transition-all cursor-pointer"
                            >
                              <Eye size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Logs Pagination */}
          {!isLogsLoading && logTotal > 0 && (
            <Pagination
              page={logPage}
              totalPages={Math.ceil(logTotal / logLimit)}
              totalItems={logTotal}
              itemsPerPage={logLimit}
              onPageChange={setLogPage}
              onLimitChange={setLogLimit}
              itemLabel="bản ghi"
            />
          )}
        </div>
      )}

      {/* --- TEMPLATES TAB CONTENT --- */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          {isTemplatesLoading ? (
            <div className="py-24 text-center text-muted-foreground">
              <div className="flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="font-body text-xs">
                  Đang tải danh sách mẫu...
                </span>
              </div>
            </div>
          ) : templates.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground font-body text-xs border border-border border-dashed rounded-2xl">
              Chưa cấu hình mẫu tin nhắn nào. Nhấn {'"Thêm mẫu"'} để bắt đầu.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-surface rounded-2xl border border-border p-6 shadow-sm flex flex-col justify-between hover:shadow-lg transition-all duration-200"
                >
                  <div className="space-y-4">
                    {/* Badge / Code */}
                    <div className="flex justify-between items-center">
                      <span className="font-display font-black text-foreground text-sm tracking-wide">
                        {tpl.code}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase border border-border px-2 py-0.5 rounded-full bg-background">
                        {tpl.channel === "EMAIL" ? (
                          <>
                            <Mail className="w-3 h-3 text-blue-400" /> EMAIL
                          </>
                        ) : (
                          <>
                            <Smartphone className="w-3 h-3 text-violet-400" />{" "}
                            APP
                          </>
                        )}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="space-y-2">
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block tracking-wider">
                          Tiêu đề email
                        </span>
                        <p className="text-xs font-bold text-foreground leading-snug line-clamp-1">
                          {tpl.subject}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block tracking-wider">
                          Nội dung preview
                        </span>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3 font-mono bg-background/50 p-2.5 rounded-xl border border-border/40 mt-1">
                          {tpl.content}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 border-t border-border/50 pt-4 mt-6">
                    <button
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="p-2 border border-border hover:border-rose-500/30 text-muted-foreground hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-all cursor-pointer active:scale-95"
                      title="Xóa mẫu"
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      onClick={() => handleOpenTemplateModal(tpl)}
                      className="bg-primary hover:bg-primary-container text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 hover:shadow-lg hover:shadow-primary/20"
                    >
                      <Edit2 size={13} /> Chỉnh sửa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- TEMPLATE CREATE/EDIT MODAL --- */}
      {isTemplateModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          {/* Overlay */}
          <div
            onClick={() => setIsTemplateModalOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl shadow-2xl relative z-10 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-border flex justify-between items-center bg-surface-low">
              <h3 className="font-display text-base font-bold text-foreground">
                {selectedTemplate
                  ? "Cập nhật mẫu tin nhắn"
                  : "Thêm mới mẫu tin nhắn"}
              </h3>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="p-1.5 hover:bg-surface-high hover:text-foreground rounded-lg text-muted-foreground transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSaveTemplate}
              className="flex-1 overflow-y-auto p-5 space-y-4 text-xs font-body"
            >
              {/* Template Code */}
              <div className="space-y-1.5">
                <label className="font-bold text-muted-foreground uppercase tracking-wider block">
                  Mã định danh *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!selectedTemplate}
                  placeholder="Ví dụ: TICKET_CONFIRMATION"
                  value={templateCodeForm}
                  onChange={(e) =>
                    setTemplateCodeForm(e.target.value.toUpperCase())
                  }
                  className="px-3 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:border-primary w-full text-foreground font-mono disabled:opacity-50"
                />
              </div>

              {/* Channel */}
              <div className="space-y-1.5">
                <label className="font-bold text-muted-foreground uppercase tracking-wider block">
                  Kênh gửi tin *
                </label>
                <select
                  value={templateChannelForm}
                  onChange={(e) => setTemplateChannelForm(e.target.value)}
                  className="bg-background border border-border rounded-xl px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:border-primary w-full h-11 cursor-pointer"
                >
                  <option value="EMAIL">EMAIL (Thư điện tử)</option>
                  <option value="APP">
                    APP (Thông báo đẩy trong ứng dụng)
                  </option>
                </select>
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="font-bold text-muted-foreground uppercase tracking-wider block">
                  Tiêu đề *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Your ticket details for {{concert_name}}"
                  value={templateSubjectForm}
                  onChange={(e) => setTemplateSubjectForm(e.target.value)}
                  className="px-3 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:border-primary w-full text-foreground font-bold"
                />
              </div>

              {/* Content */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-bold text-muted-foreground uppercase tracking-wider block">
                    Nội dung mẫu tin nhắn *
                  </label>
                  <span className="text-[10px] text-muted-foreground font-bold italic">
                    Placeholder: {"{{fullName}}"}, {"{{concert_name}}"},{" "}
                    {"{{tickets_list}}"}, {"{{start_time}}"}, {"{{location}}"}
                  </span>
                </div>
                <textarea
                  required
                  rows={10}
                  placeholder="Nhập nội dung mẫu tin nhắn..."
                  value={templateContentForm}
                  onChange={(e) => setTemplateContentForm(e.target.value)}
                  className="px-3 py-2.5 border border-border rounded-xl bg-background focus:outline-none focus:border-primary w-full text-foreground font-mono leading-relaxed resize-y"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-3 border-t border-border mt-6">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(false)}
                  className="bg-background hover:bg-surface-low border border-border text-foreground font-semibold py-2.5 px-4 rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingTemplate}
                  className="bg-primary hover:bg-primary-container text-white font-bold py-2.5 px-5 rounded-xl transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingTemplate ? "Đang lưu..." : "Lưu mẫu tin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- LOG DETAIL DRAWER --- */}
      {isLogDetailOpen && selectedLog && (
        <div className="fixed inset-0 z-50 overflow-hidden select-none">
          {/* Overlay */}
          <div
            onClick={() => setIsLogDetailOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Drawer content */}
          <div className="absolute top-0 right-0 h-full w-full sm:max-w-lg bg-surface border-l border-border flex flex-col shadow-2xl overflow-hidden text-foreground">
            {/* Header */}
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-low">
              <div>
                <h3 className="font-display text-base font-bold text-foreground">
                  Chi tiết lịch sử thông báo
                </h3>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">
                  ID: {selectedLog.id}
                </p>
              </div>
              <button
                onClick={() => setIsLogDetailOpen(false)}
                className="p-1.5 hover:bg-surface-high hover:text-foreground rounded-lg text-muted-foreground transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-body">
              {/* Quick Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-background border border-border rounded-xl p-4 text-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase block tracking-wider">
                    Kênh gửi
                  </span>
                  <span className="inline-flex items-center gap-1 mt-1.5 font-bold text-foreground">
                    {selectedLog.template?.channel === "EMAIL" ? (
                      <Mail className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Smartphone className="w-4 h-4 text-violet-400" />
                    )}
                    {selectedLog.template?.channel || "N/A"}
                  </span>
                </div>
                <div className="bg-background border border-border rounded-xl p-4 text-center">
                  <span className="text-[9px] font-bold text-muted-foreground uppercase block tracking-wider">
                    Trạng thái
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black border mt-1.5 uppercase ${
                      selectedLog.status === "SENT"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : selectedLog.status === "FAILED"
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {selectedLog.status}
                  </span>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="bg-background rounded-xl border border-border p-5 space-y-3.5">
                <div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase block tracking-wider">
                    Người nhận
                  </span>
                  <p className="font-bold text-foreground mt-0.5">
                    {selectedLog.user?.full_name || "Hệ thống"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {selectedLog.user?.email}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase block tracking-wider">
                    Địa chỉ nhận
                  </span>
                  <p className="font-mono font-bold text-foreground mt-0.5">
                    {selectedLog.target}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase block tracking-wider">
                    Mã mẫu tin nhắn
                  </span>
                  <span className="inline-block mt-0.5 font-bold font-mono text-foreground px-2 py-0.5 bg-surface rounded border border-border">
                    {selectedLog.template?.code}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-muted-foreground uppercase block tracking-wider">
                    Thời gian khởi tạo
                  </span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {new Date(selectedLog.created_at).toLocaleString("vi-VN")}
                  </p>
                </div>
                {selectedLog.sent_at && (
                  <div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase block tracking-wider">
                      Thời gian gửi thành công
                    </span>
                    <p className="font-semibold text-emerald-400 mt-0.5">
                      {new Date(selectedLog.sent_at).toLocaleString("vi-VN")}
                    </p>
                  </div>
                )}
              </div>

              {/* Fail reason if failed */}
              {selectedLog.status === "FAILED" && selectedLog.error_message && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl p-5 space-y-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider block">
                    Chi tiết lỗi
                  </span>
                  <p className="font-mono text-[10px] leading-relaxed break-all">
                    {selectedLog.error_message}
                  </p>
                </div>
              )}

              {/* Subject */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-bold text-muted-foreground uppercase block tracking-wider">
                  Tiêu đề email
                </span>
                <p className="font-bold text-foreground bg-background p-3 rounded-xl border border-border leading-snug">
                  {selectedLog.template?.subject || "Không có tiêu đề"}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border bg-surface-low flex justify-end">
              <button
                onClick={() => setIsLogDetailOpen(false)}
                className="bg-background hover:bg-surface-low border border-border text-foreground font-semibold py-2 px-4 rounded-xl transition-all cursor-pointer active:scale-95"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
