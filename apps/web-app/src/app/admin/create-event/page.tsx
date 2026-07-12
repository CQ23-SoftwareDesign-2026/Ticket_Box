"use client";

import Link from "next/link";
import { useEffect, useRef, useState, Suspense, type ChangeEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import {
  createConcert,
  updateConcert,
  getConcertById,
} from "@/services/concert.service";
import { uploadImage, uploadSvg } from "@/services/upload.service";
import { getErrorMessage } from "@/utils/error.utils";
import { generateBio, getJobStatus } from "@/services/worker.service";
import {
  ChevronRight,
  Info,
  ImagePlus,
  Bot,
  Upload,
  Sparkles,
  Ticket,
  PlusCircle,
  Trash2,
} from "lucide-react";

type TicketCategory = {
  id?: string;
  name: string;
  price: number;
  total_quantity: number;
  max_per_user: number;
  gate_number?: number | null;
  position: number;
  status: string;
  sales_start_at: string;
};

const formatNumberString = (
  value: number | string | null | undefined,
): string => {
  if (value === null || value === undefined || value === "") return "";
  const numString = String(value).replace(/\D/g, "");
  if (!numString) return "";
  const num = parseInt(numString, 10);
  return new Intl.NumberFormat("vi-VN").format(num);
};

const parseFormattedNumber = (value: string): number => {
  const cleanString = value.replace(/\./g, "").replace(/,/g, "");
  const num = parseInt(cleanString, 10);
  return isNaN(num) ? 0 : num;
};

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4 select-none">
      <div className="bg-surface border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <h3 className="font-display text-lg font-bold text-foreground">
          {title}
        </h3>
        <p className="font-body text-sm text-muted-foreground leading-relaxed">
          {message}
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-border text-foreground hover:bg-surface-high transition-all cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function EventForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditing = !!editId;
  const pressKitInputRef = useRef<HTMLInputElement | null>(null);
  const { success, error: toastError, warning } = useToast();

  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [pressKitFile, setPressKitFile] = useState<File | null>(null);

  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingSvg, setIsUploadingSvg] = useState(false);

  // Confirmation Modals State
  const [confirmDeleteIdx, setConfirmDeleteIdx] = useState<number | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  // Lightbox view state
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Performers tags state
  const [newPerformer, setNewPerformer] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    ai_bio: "",
    start_time: "",
    svg_map_url: "https://cdn.ticketbox.local/maps/default.svg",
    poster_url: "",
    status: "DRAFT",
    performers: [] as string[],
  });

  const [ticketCategories, setTicketCategories] = useState<TicketCategory[]>(
    () => [
      {
        name: "Vé Phổ Thông",
        price: 500000,
        total_quantity: 1000,
        max_per_user: 4,
        gate_number: 1,
        position: 1,
        status: "book_now",
        sales_start_at: new Date(Date.now() + 3600 * 24 * 7 * 1000)
          .toISOString()
          .slice(0, 16),
      },
    ],
  );

  const [isGeneratingBio, setIsGeneratingBio] = useState(false);
  const [bioProgress, setBioProgress] = useState<number | null>(null);

  const handleCoverImageChange = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const res = await uploadImage(file);
      setFormData((prev) => ({ ...prev, poster_url: res.url }));
      success("Đăng tải ảnh bìa thành công!");
    } catch (error) {
      console.error("Image upload failed", error);
      toastError("Tải ảnh bìa lên thất bại.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSvgMapChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isSvg =
      file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");

    try {
      setIsUploadingSvg(true);
      let res;
      if (isSvg) {
        res = await uploadSvg(file);
      } else {
        res = await uploadImage(file);
      }
      setFormData((prev) => ({ ...prev, svg_map_url: res.url }));
      success("Đăng tải sơ đồ ghế ngồi thành công!");
    } catch (error) {
      console.error("Map upload failed", error);
      toastError("Tải sơ đồ ghế ngồi thất bại.");
    } finally {
      setIsUploadingSvg(false);
    }
  };

  const handlePressKitButtonClick = () => {
    pressKitInputRef.current?.click();
  };

  const handlePressKitChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setPressKitFile(file);
  };

  useEffect(() => {
    if (editId) {
      getConcertById(editId)
        .then((data) => {
          let formattedDate = "";
          try {
            if (data.startTime) {
              const dateObj = new Date(data.startTime);
              if (!isNaN(dateObj.getTime())) {
                formattedDate = dateObj.toISOString().slice(0, 16);
              }
            }
          } catch {
            // Ignore date formatting issues
          }

          setFormData({
            name: data.title || "",
            description: data.description || "",
            location:
              data.venue && data.city
                ? `${data.venue}, ${data.city}`
                : data.venue || "",
            ai_bio: data.aiBio || "",
            start_time: formattedDate,
            svg_map_url:
              data.mapUrl || "https://cdn.ticketbox.local/maps/default.svg",
            poster_url: data.posterUrl || "",
            status: data.status || "DRAFT",
            performers: data.performers || [],
          });

          if (data.ticketTiers && data.ticketTiers.length > 0) {
            setTicketCategories(
              data.ticketTiers.map((t) => ({
                id: t.id,
                name: t.name,
                price: t.price,
                total_quantity: t.total_quantity,
                max_per_user: t.max_per_user,
                gate_number: t.gate_number ?? null,
                position: t.position ?? 1,
                status: t.status || "book_now",
                sales_start_at: t.sales_start_at
                  ? new Date(t.sales_start_at).toISOString().slice(0, 16)
                  : "",
              })),
            );
          }
          setIsLoading(false);
        })
        .catch((err) => {
          console.error("Failed to load concert", err);
          toastError("Không thể tải thông tin sự kiện.");
          setIsLoading(false);
        });
    }
  }, [editId, toastError]);

  const handleSave = async () => {
    if (!formData.name || !formData.location || !formData.start_time) {
      warning(
        "Vui lòng điền đầy đủ Tên sự kiện, Địa điểm và Thời gian bắt đầu.",
      );
      return;
    }

    const startDate = new Date(formData.start_time);
    if (startDate <= new Date()) {
      warning("Thời gian bắt đầu sự kiện phải ở tương lai.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        location: formData.location,
        ai_bio: formData.ai_bio,
        start_time: startDate.toISOString(),
        svg_map_url: formData.svg_map_url,
        poster_url: formData.poster_url,
        status: formData.status,
        performers: formData.performers,
        ticketTiers: ticketCategories.map((tc) => ({
          id: tc.id,
          name: tc.name,
          price: Number(tc.price),
          total_quantity: Number(tc.total_quantity),
          max_per_user: Number(tc.max_per_user),
          gate_number: tc.gate_number ? Number(tc.gate_number) : null,
          position: Number(tc.position),
          status: tc.status,
          sales_start_at: tc.sales_start_at
            ? new Date(tc.sales_start_at).toISOString()
            : null,
        })),
      };

      if (isEditing) {
        await updateConcert(editId, payload);
        success("Cập nhật sự kiện thành công!");
      } else {
        await createConcert(payload);
        success("Tạo sự kiện mới thành công!");
      }
      router.push("/admin/events");
    } catch (error: unknown) {
      console.error("Failed to save event", error);
      toastError(`Lưu sự kiện thất bại: ${getErrorMessage(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTier = () => {
    const nextPos = ticketCategories.length + 1;
    setTicketCategories([
      ...ticketCategories,
      {
        name: `Hạng Vé ${nextPos}`,
        price: 0,
        total_quantity: 100,
        max_per_user: 4,
        gate_number: 1,
        position: nextPos,
        status: "book_now",
        sales_start_at: new Date(Date.now() + 3600 * 24 * 7 * 1000)
          .toISOString()
          .slice(0, 16),
      },
    ]);
  };

  const handleRemoveTier = (index: number) => {
    setConfirmDeleteIdx(index);
  };

  const confirmDeleteTier = () => {
    if (confirmDeleteIdx !== null) {
      setTicketCategories(
        ticketCategories.filter((_, i) => i !== confirmDeleteIdx),
      );
      setConfirmDeleteIdx(null);
      success("Đã xóa hạng vé thành công.");
    }
  };

  const handleTierChange = (
    index: number,
    field: keyof TicketCategory,
    value: string | number | null,
  ) => {
    const newTiers = [...ticketCategories];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setTicketCategories(newTiers);
  };

  const handleAddPerformer = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newPerformer.trim();
    if (!cleanName) return;
    if (formData.performers.includes(cleanName)) {
      warning("Nghệ sĩ này đã có trong danh sách.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      performers: [...prev.performers, cleanName],
    }));
    setNewPerformer("");
  };

  const handleRemovePerformer = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      performers: prev.performers.filter((p) => p !== name),
    }));
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (formData.name || formData.location || ticketCategories.length > 1) {
      setConfirmCancel(true);
    } else {
      router.push("/admin/events");
    }
  };

  const generateAIBio = async () => {
    if (!isEditing || !editId) {
      warning("Vui lòng tạo và lưu sự kiện trước khi sinh tiểu sử bằng AI.");
      return;
    }
    if (!pressKitFile) {
      warning("Vui lòng chọn file Press Kit PDF trước.");
      return;
    }

    setIsGeneratingBio(true);
    setBioProgress(0);

    try {
      const res = await generateBio(editId, pressKitFile);
      const jobId = res.job_id;

      const pollInterval = setInterval(async () => {
        try {
          const job = await getJobStatus(jobId);
          setBioProgress(job.progress_percentage);

          if (job.status === "COMPLETED") {
            clearInterval(pollInterval);
            setIsGeneratingBio(false);
            setBioProgress(null);
            const updated = await getConcertById(editId);
            setFormData((prev) => ({ ...prev, ai_bio: updated.aiBio || "" }));
            success("Tạo thông tin tiểu sử sự kiện bằng AI thành công!");
          } else if (job.status === "FAILED") {
            clearInterval(pollInterval);
            setIsGeneratingBio(false);
            setBioProgress(null);
            toastError(
              `Sinh tiểu sử AI thất bại: ${job.error_message || "Lỗi không xác định"}`,
            );
          }
        } catch (err) {
          console.error("Error checking bio job status:", err);
        }
      }, 2000);
    } catch (err: unknown) {
      console.error(err);
      toastError(
        err instanceof Error
          ? err.message
          : "Không thể bắt đầu tiến trình sinh tiểu sử AI",
      );
      setIsGeneratingBio(false);
      setBioProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <header className="mb-8 pb-4 border-b border-border">
        <nav
          aria-label="Breadcrumb"
          className="flex text-muted-foreground font-body text-xs font-semibold mb-2"
        >
          <ol className="inline-flex items-center space-x-1 md:space-x-3">
            <li className="inline-flex items-center">
              <Link
                className="hover:text-primary transition-colors"
                href="/admin/events"
              >
                Sự kiện
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <ChevronRight className="w-4 h-4 mx-1" />
                <span className="text-foreground">
                  {isEditing ? "Chỉnh sửa sự kiện" : "Tạo sự kiện mới"}
                </span>
              </div>
            </li>
          </ol>
        </nav>
        <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
          {isEditing ? "Chỉnh sửa sự kiện" : "Thiết lập sự kiện mới"}
        </h2>
      </header>

      {/* Form Wizard */}
      <div className="max-w-[800px] mx-auto">
        <div className="space-y-8">
          {/* Section 1: Basic Info */}
          <section className="bg-surface rounded-xl p-6 shadow-sm border border-border">
            <h3 className="font-display text-xl font-bold border-b border-border pb-4 mb-6 flex items-center gap-2">
              <Info className="w-6 h-6 text-primary" />
              Thông tin cơ bản
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block font-body text-xs font-semibold text-foreground mb-1">
                  Tên sự kiện
                </label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-shadow text-sm"
                  placeholder="Ví dụ: Mắt Nhắm Mắt Mở 2026"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block font-body text-xs font-semibold text-foreground mb-1">
                  Mô tả ngắn
                </label>
                <input
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary transition-shadow text-sm"
                  placeholder="Nhập mô tả ngắn gọn về sự kiện..."
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              {/* Performers Input chips */}
              <div>
                <label className="block font-body text-xs font-semibold text-foreground mb-1">
                  Nghệ sĩ biểu diễn
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                    placeholder="Nhập tên nghệ sĩ (Ví dụ: Phùng Khánh Linh, Vũ...) và nhấn Thêm"
                    type="text"
                    value={newPerformer}
                    onChange={(e) => setNewPerformer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddPerformer(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddPerformer}
                    className="px-4 bg-surface-low border border-border hover:bg-surface-high hover:border-primary text-primary text-xs font-bold rounded-lg transition-all cursor-pointer active:scale-95 shrink-0"
                  >
                    Thêm
                  </button>
                </div>
                {formData.performers.length > 0 ? (
                  <div className="flex flex-wrap gap-2 p-3 bg-background/50 border border-border rounded-lg">
                    {formData.performers.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-high border border-border text-foreground rounded-full text-xs font-semibold select-none"
                      >
                        {p}
                        <button
                          type="button"
                          onClick={() => handleRemovePerformer(p)}
                          className="hover:text-red-400 text-muted-foreground transition-colors font-bold cursor-pointer"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Chưa cấu hình nghệ sĩ nào cho sự kiện.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block font-body text-xs font-semibold text-foreground mb-1">
                    Địa điểm tổ chức
                  </label>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                    type="text"
                    placeholder="Ví dụ: Nhà Thi Đấu Phú Thọ, Quận 11, TP. HCM"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block font-body text-xs font-semibold text-foreground mb-1">
                    Ngày & Giờ bắt đầu
                  </label>
                  <input
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block font-body text-xs font-semibold text-foreground mb-1">
                    Trạng thái sự kiện
                  </label>
                  <select
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm cursor-pointer appearance-none"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-body text-xs font-semibold text-foreground mb-1">
                  Ảnh bìa sự kiện{" "}
                  <span className="text-muted-foreground font-normal">
                    (Tùy chọn)
                  </span>
                </label>
                {formData.poster_url && (
                  <div
                    onClick={() => setLightboxUrl(formData.poster_url)}
                    className="mb-3 relative w-full h-48 rounded-xl overflow-hidden border border-border bg-black/20 cursor-zoom-in hover:border-primary/50 transition-all group"
                    title="Click để phóng to ảnh bìa"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.poster_url}
                      alt="Cover preview"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                )}
                <div className="mt-2 flex justify-center rounded-xl border-2 border-dashed border-border px-6 py-10 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer group relative">
                  <input
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageChange}
                    disabled={isUploadingImage}
                  />
                  <div className="text-center">
                    <ImagePlus className="w-10 h-10 mx-auto text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                    <div className="mt-4 flex text-sm leading-6 text-muted-foreground justify-center">
                      <span className="font-semibold text-primary hover:text-primary/80">
                        {isUploadingImage
                          ? "Đang tải ảnh lên..."
                          : "Tải ảnh lên"}
                      </span>
                      {!isUploadingImage && (
                        <p className="pl-1">hoặc kéo thả vào đây</p>
                      )}
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Hỗ trợ PNG, JPG, WEBP dung lượng tối đa 5MB
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-body text-xs font-semibold text-foreground mb-1">
                  Sơ đồ ghế ngồi{" "}
                  <span className="text-muted-foreground font-normal">
                    (Tùy chọn)
                  </span>
                </label>
                {formData.svg_map_url &&
                  formData.svg_map_url !==
                    "https://cdn.ticketbox.local/maps/default.svg" && (
                    <div
                      onClick={() => setLightboxUrl(formData.svg_map_url)}
                      className="mb-3 relative w-full h-64 rounded-xl overflow-hidden border border-border bg-black/40 flex items-center justify-center p-4 cursor-zoom-in hover:border-primary/50 transition-all group"
                      title="Click để phóng to sơ đồ ghế ngồi"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={formData.svg_map_url}
                        alt="Sơ đồ ghế ngồi"
                        className="max-w-full max-h-full object-contain group-hover:scale-[1.02] transition-transform duration-300"
                      />
                    </div>
                  )}
                <div className="mt-2 flex justify-center rounded-xl border-2 border-dashed border-border px-6 py-10 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer group relative">
                  <input
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    type="file"
                    accept=".svg,image/svg+xml,image/*"
                    onChange={handleSvgMapChange}
                    disabled={isUploadingSvg}
                  />
                  <div className="text-center">
                    <ImagePlus className="w-10 h-10 mx-auto text-muted-foreground group-hover:text-primary transition-colors mb-2" />
                    <div className="mt-4 flex text-sm leading-6 text-muted-foreground justify-center">
                      <span className="font-semibold text-primary hover:text-primary/80">
                        {isUploadingSvg
                          ? "Đang tải sơ đồ lên..."
                          : "Tải sơ đồ lên"}
                      </span>
                      {!isUploadingSvg && (
                        <p className="pl-1">hoặc kéo thả vào đây</p>
                      )}
                    </div>
                    <p className="text-xs leading-5 text-muted-foreground">
                      Hỗ trợ SVG, PNG, JPG, WEBP dung lượng tối đa 5MB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 2: Artist & AI Bio */}
          <section className="bg-surface rounded-xl p-6 shadow-sm border border-border">
            <h3 className="font-display text-xl font-bold border-b border-border pb-4 mb-6 flex items-center gap-2">
              <Bot className="w-6 h-6 text-secondary" />
              Thông tin nghệ sĩ & Tạo tiểu sử AI
            </h3>

            {!isEditing ? (
              <div className="p-6 rounded-xl bg-surface-low border border-dashed border-border text-center flex flex-col items-center justify-center gap-3 select-none">
                <Bot className="w-12 h-12 text-muted-foreground animate-pulse" />
                <p className="font-body text-sm text-muted-foreground font-semibold">
                  Tính năng sinh thông tin tiểu sử bằng AI khả dụng sau khi sự
                  kiện được khởi tạo.
                </p>
                <p className="font-body text-xs text-muted-foreground/70 max-w-md leading-relaxed">
                  Sau khi tạo sự kiện dưới dạng **DRAFT**, bạn có thể cập nhật
                  sự kiện để tải lên Press Kit (PDF) và sử dụng AI sinh tự động
                  mô tả sự kiện chi tiết.
                </p>
              </div>
            ) : (
              <>
                <div className="p-4 rounded-lg bg-surface-low border border-border mb-5">
                  <h4 className="font-body text-xs font-semibold text-foreground mb-2">
                    Tải lên Press Kit (PDF){" "}
                    <span className="text-muted-foreground font-normal">
                      (Tùy chọn)
                    </span>
                  </h4>
                  <div className="flex flex-wrap items-center gap-4">
                    <input
                      ref={pressKitInputRef}
                      accept=".pdf,application/pdf"
                      className="hidden"
                      type="file"
                      onChange={handlePressKitChange}
                    />
                    <button
                      type="button"
                      onClick={handlePressKitButtonClick}
                      className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-surface-high transition-colors text-sm font-medium flex items-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      {pressKitFile ? "Thay thế file" : "Chọn file PDF"}
                    </button>
                    <span className="text-sm text-muted-foreground italic">
                      {pressKitFile
                        ? pressKitFile.name
                        : "Chưa chọn file nào. Hãy tải lên file PDF để AI sinh tiểu sử sự kiện."}
                    </span>
                  </div>
                </div>
                <div className="relative">
                  <label className="block font-body text-xs font-semibold text-foreground mb-1 flex justify-between">
                    <div>
                      Mô tả sự kiện chi tiết (AI sinh hoặc soạn thảo){" "}
                      <span className="text-muted-foreground font-normal">
                        (Tùy chọn)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={generateAIBio}
                      disabled={isGeneratingBio}
                      className="text-primary hover:text-primary/80 text-xs flex items-center gap-1 disabled:opacity-50 font-bold cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      {isGeneratingBio
                        ? `Đang sinh mô tả (${bioProgress ?? 0}%)`
                        : "Tạo bằng AI"}
                    </button>
                  </label>

                  <textarea
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                    placeholder="Nhập nội dung mô tả chi tiết cho sự kiện của bạn..."
                    rows={6}
                    value={formData.ai_bio}
                    onChange={(e) =>
                      setFormData({ ...formData, ai_bio: e.target.value })
                    }
                    disabled={isGeneratingBio}
                  ></textarea>
                </div>
              </>
            )}
          </section>

          {/* Section 3: Ticketing */}
          <section className="bg-surface rounded-xl p-6 shadow-sm border border-border">
            <div className="flex justify-between items-center border-b border-border pb-4 mb-6">
              <h3 className="font-display text-xl font-bold flex items-center gap-2">
                <Ticket className="w-6 h-6 text-primary" />
                Cấu hình hạng vé
              </h3>
              <button
                onClick={handleAddTier}
                className="px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 transition-all font-body text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" /> Thêm hạng vé
              </button>
            </div>

            {ticketCategories.map((tier, index) => (
              <div
                key={index}
                className="border border-border rounded-xl p-5 mb-6 bg-background relative overflow-hidden group"
              >
                <div
                  className={`absolute top-0 left-0 w-1 h-full ${index % 2 === 0 ? "bg-secondary" : "bg-primary"}`}
                ></div>
                <div className="flex justify-between items-start mb-4 pl-2">
                  <input
                    className="font-display text-xl font-bold bg-transparent border-none p-0 focus:ring-0 w-2/3 text-foreground placeholder:text-muted-foreground focus:outline-none"
                    placeholder="Tên hạng vé (ví dụ: Hạng Cloud, VIP...)"
                    type="text"
                    value={tier.name}
                    onChange={(e) =>
                      handleTierChange(index, "name", e.target.value)
                    }
                  />
                  <button
                    onClick={() => handleRemoveTier(index)}
                    className="text-muted-foreground hover:text-error transition-colors cursor-pointer"
                    title="Xóa hạng vé"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pl-2 mb-4">
                  <div>
                    <label className="block font-body text-xs font-semibold text-muted-foreground mb-1">
                      Giá vé (VNĐ)
                    </label>
                    <input
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm text-right font-mono"
                      type="text"
                      value={formatNumberString(tier.price)}
                      onChange={(e) => {
                        const rawVal = parseFormattedNumber(e.target.value);
                        handleTierChange(index, "price", rawVal);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block font-body text-xs font-semibold text-muted-foreground mb-1">
                      Tổng số lượng vé
                    </label>
                    <input
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm text-right font-mono"
                      type="text"
                      value={formatNumberString(tier.total_quantity)}
                      onChange={(e) => {
                        const rawVal = parseFormattedNumber(e.target.value);
                        handleTierChange(index, "total_quantity", rawVal);
                      }}
                    />
                  </div>
                  <div>
                    <label className="block font-body text-xs font-semibold text-muted-foreground mb-1">
                      Tối đa / Người mua
                    </label>
                    <input
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                      type="number"
                      value={tier.max_per_user}
                      onChange={(e) =>
                        handleTierChange(
                          index,
                          "max_per_user",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-body text-xs font-semibold text-muted-foreground mb-1">
                      Số cổng vào
                    </label>
                    <input
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                      type="number"
                      placeholder="Ví dụ: 1"
                      value={tier.gate_number ?? ""}
                      onChange={(e) =>
                        handleTierChange(
                          index,
                          "gate_number",
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                    />
                  </div>
                </div>

                {/* Additional API parameters for tier */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-2 border-t border-border/40 pt-4">
                  <div>
                    <label className="block font-body text-xs font-semibold text-muted-foreground mb-1">
                      Thứ tự hiển thị (Position)
                    </label>
                    <input
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                      type="number"
                      value={tier.position}
                      onChange={(e) =>
                        handleTierChange(
                          index,
                          "position",
                          Number(e.target.value),
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-body text-xs font-semibold text-muted-foreground mb-1">
                      Thời gian mở bán
                    </label>
                    <input
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm"
                      type="datetime-local"
                      value={tier.sales_start_at}
                      onChange={(e) =>
                        handleTierChange(
                          index,
                          "sales_start_at",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className="block font-body text-xs font-semibold text-muted-foreground mb-1">
                      Trạng thái hạng vé
                    </label>
                    <select
                      className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-foreground focus:border-primary focus:ring-1 focus:ring-primary text-sm cursor-pointer"
                      value={tier.status}
                      onChange={(e) =>
                        handleTierChange(index, "status", e.target.value)
                      }
                    >
                      <option value="book_now">BOOK NOW</option>
                      <option value="sold_out">SOLD OUT</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>

      {/* Sticky Bottom Actions Bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-surface/95 backdrop-blur-md border-t border-border p-4 flex justify-end gap-3 z-30 shadow-lg select-none">
        <button
          type="button"
          onClick={handleCancelClick}
          className="px-6 py-2.5 rounded-lg border border-border text-foreground hover:bg-surface-high transition-all active:scale-95 font-body text-xs font-semibold cursor-pointer"
        >
          Hủy
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-body text-xs font-semibold hover:bg-primary-hover active:scale-95 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
        >
          {isSaving
            ? "Đang lưu..."
            : isEditing
              ? "Lưu thay đổi"
              : "Tạo sự kiện"}
        </button>
      </div>

      {/* Reusable Confirm Modals */}
      <ConfirmModal
        isOpen={confirmDeleteIdx !== null}
        title="Xác nhận xóa hạng vé"
        message="Bạn có chắc chắn muốn xóa hạng vé này? Các thông tin cấu hình giá và số lượng vé của hạng này sẽ mất."
        confirmLabel="Xóa"
        cancelLabel="Hủy"
        onConfirm={confirmDeleteTier}
        onCancel={() => setConfirmDeleteIdx(null)}
      />

      <ConfirmModal
        isOpen={confirmCancel}
        title="Hủy bỏ thay đổi"
        message="Bạn có chắc chắn muốn rời đi? Các thay đổi chưa lưu trên biểu mẫu sẽ bị mất."
        confirmLabel="Rời đi"
        cancelLabel="Ở lại"
        onConfirm={() => router.push("/admin/events")}
        onCancel={() => setConfirmCancel(false)}
      />

      {/* Lightbox Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[300] flex items-center justify-center p-4 cursor-zoom-out select-none animate-in fade-in duration-200"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            className="absolute top-6 right-6 text-white/70 hover:text-white transition-colors cursor-pointer text-xl font-bold bg-white/10 hover:bg-white/20 w-10 h-10 rounded-full flex items-center justify-center"
            onClick={() => setLightboxUrl(null)}
          >
            &times;
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxUrl}
            alt="Xem ảnh lớn"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-200"
          />
        </div>
      )}
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <EventForm />
    </Suspense>
  );
}
