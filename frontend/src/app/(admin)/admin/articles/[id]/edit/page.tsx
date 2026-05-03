"use client";

import { useEffect, useState, useRef, useCallback, type DragEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Save,
  Upload,
  Trash2,
  Globe,
  EyeOff,
  Archive,
  Download,
  FileUp,
  X,
  ImagePlus,
  Paperclip,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  clientFetch,
  type Article,
  type Category,
  type ArticleImage,
  type ArticleAttachment,
} from "@/lib/api";
import { cn, formatDate, formatFileSize } from "@/lib/utils";

type Tab = "content" | "images" | "attachments" | "publish";

const tabs: { label: string; value: Tab }[] = [
  { label: "Nội Dung", value: "content" },
  { label: "Hình Ảnh", value: "images" },
  { label: "Tài Liệu Đính Kèm", value: "attachments" },
  { label: "Xuất Bản", value: "publish" },
];

// API returns ISO timestamps (with Z); <input type="datetime-local"> wants
// the local-clock format YYYY-MM-DDTHH:mm. Strip seconds + tz, keep clock value.
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

// Inverse: take the local-clock string back to ISO so the API receives a
// well-formed timestamptz. Empty string → null (clears the column on save).
function fromLocalInput(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function EditArticlePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("content");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Content form state
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [ward, setWard] = useState("");
  const [assetType, setAssetType] = useState("");
  const [plotCount, setPlotCount] = useState("");
  const [totalArea, setTotalArea] = useState("");

  // Auction Event state — drives Event JSON-LD on the public article page.
  // All optional; when empty no Event schema is emitted.
  const [auctionStart, setAuctionStart] = useState(""); // datetime-local format
  const [auctionEnd, setAuctionEnd] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [startingPrice, setStartingPrice] = useState("");
  const [depositAmount, setDepositAmount] = useState("");

  // Image state
  const [images, setImages] = useState<ArticleImage[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageDragging, setImageDragging] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Attachment state
  const [attachments, setAttachments] = useState<ArticleAttachment[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [attachmentDragging, setAttachmentDragging] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const loadArticle = useCallback(async () => {
    try {
      const [articleRes, categoriesRes] = await Promise.all([
        clientFetch<{ data: Article }>(`/admin/articles/${id}`),
        clientFetch<{ data: Category[] }>("/categories"),
      ]);

      const articleData = articleRes.data;
      setArticle(articleData);
      setCategories(categoriesRes.data);
      setImages(articleData.images || []);
      setAttachments(articleData.attachments || []);

      // Populate form
      setTitle(articleData.title);
      setSlug(articleData.slug);
      setDescription(articleData.description || "");
      setMetaDescription(articleData.metaDescription || "");
      setAuthorName(articleData.authorName);
      setCategoryId(articleData.categoryId || "");
      setProvince(articleData.province || "");
      setDistrict(articleData.district || "");
      setWard(articleData.ward || "");
      setAssetType(articleData.assetType || "");
      setPlotCount(articleData.plotCount?.toString() || "");
      setTotalArea(articleData.totalArea || "");
      // datetime-local input wants "YYYY-MM-DDTHH:mm" — strip seconds/Z/tz.
      setAuctionStart(toLocalInput(articleData.auctionStart));
      setAuctionEnd(toLocalInput(articleData.auctionEnd));
      setVenueName(articleData.venueName || "");
      setVenueAddress(articleData.venueAddress || "");
      setStartingPrice(articleData.startingPrice?.toString() || "");
      setDepositAmount(articleData.depositAmount?.toString() || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải bài viết");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadArticle();
  }, [loadArticle]);

  function showSuccess(msg: string) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  // --- Content tab: save metadata ---
  async function handleSaveContent() {
    setSaving(true);
    setError("");
    try {
      await clientFetch(`/admin/articles/${id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim(),
          metaDescription: metaDescription.trim() || null,
          authorName: authorName.trim(),
          categoryId: categoryId || null,
          province: province.trim() || null,
          district: district.trim() || null,
          ward: ward.trim() || null,
          assetType: assetType.trim() || null,
          plotCount: plotCount ? parseInt(plotCount, 10) : null,
          totalArea: totalArea.trim() || null,
          auctionStart: fromLocalInput(auctionStart),
          auctionEnd: fromLocalInput(auctionEnd),
          venueName: venueName.trim() || null,
          venueAddress: venueAddress.trim() || null,
          startingPrice: startingPrice ? parseInt(startingPrice, 10) : null,
          depositAmount: depositAmount ? parseInt(depositAmount, 10) : null,
        }),
      });
      showSuccess("Đã lưu thành công");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lưu thất bại");
    } finally {
      setSaving(false);
    }
  }

  // --- Images tab ---
  async function handleImageUpload(files: FileList | File[]) {
    setUploadingImages(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        await fetch(`/api/admin/articles/${id}/images`, {
          method: "POST",
          credentials: "include",
          body: formData,
        }).then((r) => {
          if (!r.ok) throw new Error("Tải ảnh thất bại");
          return r.json();
        });
      }
      await loadArticle();
      showSuccess("Tải ảnh thành công");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải ảnh thất bại");
    } finally {
      setUploadingImages(false);
    }
  }

  async function handleDeleteImage(imageId: string) {
    try {
      await clientFetch(`/admin/articles/${id}/images/${imageId}`, {
        method: "DELETE",
      });
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xoá ảnh thất bại");
    }
  }

  async function handleUpdateImageAlt(imageId: string, altText: string) {
    try {
      await clientFetch(`/admin/articles/${id}/images/${imageId}`, {
        method: "PATCH",
        body: JSON.stringify({ altText }),
      });
    } catch {
      // silent fail for alt text update
    }
  }

  // --- Attachments tab ---
  async function handleAttachmentUpload(files: FileList | File[]) {
    setUploadingAttachments(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        await fetch(`/api/admin/articles/${id}/attachments`, {
          method: "POST",
          credentials: "include",
          body: formData,
        }).then((r) => {
          if (!r.ok) throw new Error("Tải file thất bại");
          return r.json();
        });
      }
      await loadArticle();
      showSuccess("Tải file thành công");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải file thất bại");
    } finally {
      setUploadingAttachments(false);
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    try {
      await clientFetch(`/admin/articles/${id}/attachments/${attachmentId}`, {
        method: "DELETE",
      });
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xoá file thất bại");
    }
  }

  async function handleUpdateAttachmentName(
    attachmentId: string,
    fileName: string
  ) {
    try {
      await clientFetch(`/admin/articles/${id}/attachments/${attachmentId}`, {
        method: "PATCH",
        body: JSON.stringify({ fileName }),
      });
    } catch {
      // silent fail
    }
  }

  // --- Publish tab ---
  async function handlePublish() {
    setError("");
    try {
      await clientFetch(`/admin/articles/${id}/publish`, { method: "POST" });
      await loadArticle();
      showSuccess("Đã xuất bản bài viết");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xuất bản thất bại");
    }
  }

  async function handleUnpublish() {
    setError("");
    try {
      await clientFetch(`/admin/articles/${id}/unpublish`, { method: "POST" });
      await loadArticle();
      showSuccess("Đã gỡ xuất bản");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại");
    }
  }

  async function handleArchive() {
    setError("");
    try {
      await clientFetch(`/admin/articles/${id}/archive`, { method: "POST" });
      await loadArticle();
      showSuccess("Đã lưu trữ bài viết");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật thất bại");
    }
  }

  // Drag handlers for images
  function handleImageDragOver(e: DragEvent) {
    e.preventDefault();
    setImageDragging(true);
  }
  function handleImageDragLeave(e: DragEvent) {
    e.preventDefault();
    setImageDragging(false);
  }
  function handleImageDrop(e: DragEvent) {
    e.preventDefault();
    setImageDragging(false);
    if (e.dataTransfer.files.length) handleImageUpload(e.dataTransfer.files);
  }

  // Drag handlers for attachments
  function handleAttachmentDragOver(e: DragEvent) {
    e.preventDefault();
    setAttachmentDragging(true);
  }
  function handleAttachmentDragLeave(e: DragEvent) {
    e.preventDefault();
    setAttachmentDragging(false);
  }
  function handleAttachmentDrop(e: DragEvent) {
    e.preventDefault();
    setAttachmentDragging(false);
    if (e.dataTransfer.files.length)
      handleAttachmentUpload(e.dataTransfer.files);
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="rounded-md bg-red-50 p-4 font-body text-sm text-red-600">
        {error || "Không tìm thấy bài viết"}
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-charcoal">
          Chỉnh Sửa Bài Viết
        </h1>
        <p className="mt-1 font-body text-sm text-muted-fg">
          {article.title}
        </p>
      </div>

      {/* Floating toast */}
      {(success || error) && (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col gap-2">
          {success && (
            <div className="pointer-events-auto flex items-start gap-2 rounded-lg border border-green-200 bg-white px-4 py-3 font-body text-sm text-green-700 shadow-lg ring-1 ring-black/5 animate-dialog-in">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
              <span>{success}</span>
            </div>
          )}
          {error && (
            <div className="pointer-events-auto flex items-start gap-2 rounded-lg border border-red-200 bg-white px-4 py-3 font-body text-sm text-red-700 shadow-lg ring-1 ring-black/5 animate-dialog-in">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="ml-2 -mr-1 rounded p-0.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-700"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-warm-border bg-warm-white p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "rounded-md px-4 py-2 font-body text-sm font-medium transition-colors",
              activeTab === tab.value
                ? "bg-charcoal text-white"
                : "text-muted-fg hover:text-charcoal"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* --- Tab: Nội Dung --- */}
      {activeTab === "content" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-warm-border bg-white p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-charcoal">
              Thông Tin Chung
            </h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                  Tiêu đề
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                  Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                  Mô tả
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center justify-between font-body text-sm font-medium text-fg">
                  <span>
                    Meta Description{" "}
                    <span className="font-normal text-muted-fg">(SEO — hiển thị trong kết quả Google)</span>
                  </span>
                  <span
                    className={cn(
                      "font-mono text-xs",
                      metaDescription.length > 160 ? "text-red-600" : "text-muted-fg"
                    )}
                  >
                    {metaDescription.length} / 160
                  </span>
                </label>
                <textarea
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  rows={2}
                  maxLength={300}
                  placeholder="Câu mô tả ngắn gọn 150–160 ký tự cho SERP. Để trống sẽ dùng tự động từ nội dung."
                  className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                    Tác giả
                  </label>
                  <input
                    type="text"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                    Danh mục
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-warm-border bg-white p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-charcoal">
              Vị Trí & Tài Sản
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                    Tỉnh / Thành
                  </label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="Phú Thọ"
                    className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                    Huyện / Quận
                  </label>
                  <input
                    type="text"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    placeholder="Vĩnh Tường"
                    className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                    Xã / Phường
                  </label>
                  <input
                    type="text"
                    value={ward}
                    onChange={(e) => setWard(e.target.value)}
                    placeholder="xã Vĩnh Sơn"
                    className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                    Loại tài sản
                  </label>
                  <input
                    type="text"
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    placeholder="Quyền sử dụng đất"
                    className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                    Số thửa đất
                  </label>
                  <input
                    type="number"
                    value={plotCount}
                    onChange={(e) => setPlotCount(e.target.value)}
                    placeholder="23"
                    className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                    Tổng diện tích
                  </label>
                  <input
                    type="text"
                    value={totalArea}
                    onChange={(e) => setTotalArea(e.target.value)}
                    placeholder="3.721m²"
                    className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Auction Event details — feeds Schema.org Event JSON-LD */}
          <div className="rounded-lg border border-warm-border bg-white p-6">
            <h2 className="mb-1 font-heading text-lg font-semibold text-charcoal">
              Thông Tin Cuộc Đấu Giá
            </h2>
            <p className="mb-4 font-body text-xs text-muted-fg">
              Khi điền đủ thời gian + địa điểm, trang công khai sẽ hiển thị
              khối thông tin đấu giá và xuất schema Event để Google hiển thị
              ngày giờ trực tiếp trong kết quả tìm kiếm.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                    Thời gian bắt đầu
                  </label>
                  <input
                    type="datetime-local"
                    value={auctionStart}
                    onChange={(e) => setAuctionStart(e.target.value)}
                    className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                    Thời gian kết thúc
                  </label>
                  <input
                    type="datetime-local"
                    value={auctionEnd}
                    onChange={(e) => setAuctionEnd(e.target.value)}
                    className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                  Tên địa điểm
                </label>
                <input
                  type="text"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  placeholder="Hội trường UBND xã Hội Thịnh"
                  className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                  Địa chỉ địa điểm
                </label>
                <input
                  type="text"
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  placeholder="Thôn Trung, xã Hội Thịnh, tỉnh Phú Thọ"
                  className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                    Giá khởi điểm (VND)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(e.target.value)}
                    placeholder="1500000000"
                    className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block font-body text-sm font-medium text-fg">
                    Tiền đặt trước (VND)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="150000000"
                    className="w-full rounded-md border border-warm-border px-3 py-2 font-body text-sm text-fg outline-none focus:border-gold focus:ring-1 focus:ring-gold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Content preview */}
          {article.contentHtml && (
            <div className="rounded-lg border border-warm-border bg-white p-6">
              <h2 className="mb-4 font-heading text-lg font-semibold text-charcoal">
                Xem Trước Nội Dung
              </h2>
              <div
                className="prose prose-sm max-h-96 overflow-y-auto font-body"
                dangerouslySetInnerHTML={{ __html: article.contentHtml }}
              />
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveContent}
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-charcoal px-6 py-2.5 font-body text-sm font-medium text-white transition-colors hover:bg-gold disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "Đang lưu..." : "Lưu Thay Đổi"}
          </button>
        </div>
      )}

      {/* --- Tab: Hình Ảnh --- */}
      {activeTab === "images" && (
        <div className="space-y-6">
          {/* Upload zone */}
          <div
            onDragOver={handleImageDragOver}
            onDragLeave={handleImageDragLeave}
            onDrop={handleImageDrop}
            onClick={() => imageInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              imageDragging
                ? "border-gold bg-gold-pale"
                : "border-warm-border bg-white hover:border-gold hover:bg-gold-pale/30"
            }`}
          >
            <ImagePlus
              className={`mx-auto h-10 w-10 ${
                imageDragging ? "text-gold" : "text-muted-fg"
              }`}
            />
            <p className="mt-3 font-body text-sm font-medium text-charcoal">
              {uploadingImages
                ? "Đang tải lên..."
                : "Kéo thả ảnh vào đây hoặc nhấn để chọn"}
            </p>
            <p className="mt-1 font-body text-xs text-muted-fg">
              JPEG, PNG, WebP (tối đa 10MB mỗi ảnh)
            </p>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                if (e.target.files?.length)
                  handleImageUpload(e.target.files);
              }}
              className="hidden"
            />
          </div>

          {/* Image grid */}
          {images.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="group relative overflow-hidden rounded-lg border border-warm-border bg-white"
                >
                  <div className="aspect-video bg-warm-white">
                    <img
                      src={img.url}
                      alt={img.altText || img.fileName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <input
                      type="text"
                      defaultValue={img.altText}
                      placeholder="Mô tả ảnh (alt text)"
                      onBlur={(e) =>
                        handleUpdateImageAlt(img.id, e.target.value)
                      }
                      className="w-full rounded border border-warm-border px-2 py-1 font-body text-xs text-fg outline-none focus:border-gold"
                    />
                    <p className="mt-1 font-body text-xs text-muted-fg">
                      {img.width}x{img.height} - {formatFileSize(img.sizeBytes)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(img.id)}
                    className="absolute right-2 top-2 rounded-full bg-black/50 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center font-body text-sm text-muted-fg">
              Chưa có hình ảnh nào
            </p>
          )}
        </div>
      )}

      {/* --- Tab: Tài Liệu Đính Kèm --- */}
      {activeTab === "attachments" && (
        <div className="space-y-6">
          {/* Upload zone */}
          <div
            onDragOver={handleAttachmentDragOver}
            onDragLeave={handleAttachmentDragLeave}
            onDrop={handleAttachmentDrop}
            onClick={() => attachmentInputRef.current?.click()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              attachmentDragging
                ? "border-gold bg-gold-pale"
                : "border-warm-border bg-white hover:border-gold hover:bg-gold-pale/30"
            }`}
          >
            <Paperclip
              className={`mx-auto h-10 w-10 ${
                attachmentDragging ? "text-gold" : "text-muted-fg"
              }`}
            />
            <p className="mt-3 font-body text-sm font-medium text-charcoal">
              {uploadingAttachments
                ? "Đang tải lên..."
                : "Kéo thả file vào đây hoặc nhấn để chọn"}
            </p>
            <p className="mt-1 font-body text-xs text-muted-fg">
              PDF, DOCX, XLSX, CSV, DOC, PNG, JPG (tối đa 20MB)
            </p>
            <input
              ref={attachmentInputRef}
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files?.length)
                  handleAttachmentUpload(e.target.files);
              }}
              className="hidden"
            />
          </div>

          {/* Attachment list */}
          {attachments.length > 0 ? (
            <div className="space-y-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between rounded-lg border border-warm-border bg-white px-4 py-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Paperclip className="h-5 w-5 flex-shrink-0 text-muted-fg" />
                    <div className="min-w-0 flex-1">
                      <input
                        type="text"
                        defaultValue={att.fileName}
                        onBlur={(e) =>
                          handleUpdateAttachmentName(att.id, e.target.value)
                        }
                        className="w-full rounded border border-transparent px-1 py-0.5 font-body text-sm text-charcoal outline-none hover:border-warm-border focus:border-gold"
                      />
                      <p className="px-1 font-body text-xs text-muted-fg">
                        {att.fileMime} - {formatFileSize(att.sizeBytes)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded p-1.5 text-muted-fg transition-colors hover:bg-warm-white hover:text-charcoal"
                      title="Tải xuống"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(att.id)}
                      className="rounded p-1.5 text-muted-fg transition-colors hover:bg-red-50 hover:text-red-600"
                      title="Xoá"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center font-body text-sm text-muted-fg">
              Chưa có tài liệu đính kèm nào
            </p>
          )}
        </div>
      )}

      {/* --- Tab: Xuất Bản --- */}
      {activeTab === "publish" && (
        <div className="space-y-6">
          <div className="rounded-lg border border-warm-border bg-white p-6">
            <h2 className="mb-4 font-heading text-lg font-semibold text-charcoal">
              Trạng Thái Xuất Bản
            </h2>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-3 py-1 font-body text-sm font-medium",
                  article.status === "PUBLISHED" &&
                    "bg-green-100 text-green-700",
                  article.status === "DRAFT" && "bg-gray-100 text-gray-600",
                  article.status === "ARCHIVED" &&
                    "bg-stone-100 text-stone-500"
                )}
              >
                {article.status === "PUBLISHED"
                  ? "Đã Xuất Bản"
                  : article.status === "DRAFT"
                  ? "Bản Nháp"
                  : "Lưu Trữ"}
              </span>
              {article.publishedAt && (
                <span className="font-body text-sm text-muted-fg">
                  Xuất bản ngày {formatDate(article.publishedAt)}
                </span>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              {article.status !== "PUBLISHED" && (
                <button
                  type="button"
                  onClick={handlePublish}
                  className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2.5 font-body text-sm font-medium text-white transition-colors hover:bg-green-700"
                >
                  <Globe className="h-4 w-4" />
                  Xuất Bản
                </button>
              )}
              {article.status === "PUBLISHED" && (
                <button
                  type="button"
                  onClick={handleUnpublish}
                  className="flex items-center gap-2 rounded-md border border-warm-border bg-white px-4 py-2.5 font-body text-sm font-medium text-charcoal transition-colors hover:bg-warm-white"
                >
                  <EyeOff className="h-4 w-4" />
                  Gỡ Xuất Bản
                </button>
              )}
              {article.status !== "ARCHIVED" && (
                <button
                  type="button"
                  onClick={handleArchive}
                  className="flex items-center gap-2 rounded-md border border-warm-border bg-white px-4 py-2.5 font-body text-sm font-medium text-muted-fg transition-colors hover:bg-warm-white"
                >
                  <Archive className="h-4 w-4" />
                  Lưu Trữ
                </button>
              )}
            </div>
          </div>

          {/* Download original file */}
          {article.originalFileName && (
            <div className="rounded-lg border border-warm-border bg-white p-6">
              <h2 className="mb-4 font-heading text-lg font-semibold text-charcoal">
                File Gốc
              </h2>
              <div className="flex items-center gap-3">
                <FileUp className="h-8 w-8 text-muted-fg" />
                <div>
                  <p className="font-body text-sm font-medium text-charcoal">
                    {article.originalFileName}
                  </p>
                  <p className="font-body text-xs text-muted-fg">
                    {article.originalFileMime}
                  </p>
                </div>
                <a
                  href={`/api/admin/articles/${id}/download`}
                  className="ml-auto flex items-center gap-2 rounded-md bg-charcoal px-4 py-2 font-body text-sm font-medium text-white transition-colors hover:bg-gold"
                >
                  <Download className="h-4 w-4" />
                  Tải Xuống
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
