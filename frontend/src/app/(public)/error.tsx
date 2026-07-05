"use client";

import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container-narrow flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-status-soon-bg">
        <AlertTriangle className="h-8 w-8 text-status-soon" strokeWidth={1.5} />
      </div>
      <h1 className="mt-6 font-heading text-3xl font-bold text-ink sm:text-4xl">
        Đã có lỗi xảy ra
      </h1>
      <p className="mt-3 max-w-md font-body text-ink-soft">
        Trang tạm thời không tải được. Vui lòng thử lại — nếu vẫn không được, hãy
        quay lại sau ít phút.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-pine px-5 py-2.5 font-body text-sm font-semibold text-paper transition-colors hover:bg-brass"
        >
          <RotateCw className="h-4 w-4" />
          Thử lại
        </button>
        <Link
          href="/"
          className="inline-flex items-center rounded-lg border border-line bg-card px-5 py-2.5 font-body text-sm font-semibold text-ink transition-colors hover:border-pine/40"
        >
          Về trang chủ
        </Link>
      </div>
    </div>
  );
}
