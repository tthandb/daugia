import Link from "next/link";
import { Search, ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container-narrow flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-pine-pale">
        <FileQuestion className="h-8 w-8 text-pine" strokeWidth={1.5} />
      </div>
      <p className="mt-6 font-mono text-sm font-semibold tracking-widest text-brass-ink">
        404
      </p>
      <h1 className="mt-2 font-heading text-3xl font-bold text-ink sm:text-4xl">
        Không tìm thấy trang
      </h1>
      <p className="mt-3 max-w-md font-body text-ink-soft">
        Thông báo bạn tìm có thể đã được gỡ, đổi đường dẫn, hoặc chưa được công
        bố. Hãy thử tìm kiếm hoặc quay lại danh sách thông báo.
      </p>

      <form
        action="/search"
        method="get"
        role="search"
        className="mt-8 flex w-full max-w-md items-center gap-2 rounded-xl border border-line bg-card p-2 focus-within:border-pine/50"
      >
        <label htmlFor="nf-search" className="sr-only">
          Tìm thông báo đấu giá
        </label>
        <Search className="ml-2 h-5 w-5 shrink-0 text-ink-faint" aria-hidden />
        <input
          id="nf-search"
          name="q"
          type="search"
          placeholder="Tìm thông báo đấu giá…"
          className="min-w-0 flex-1 bg-transparent font-body text-sm text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-pine px-4 py-2 font-body text-sm font-semibold text-paper transition-colors hover:bg-brass"
        >
          Tìm
        </button>
      </form>

      <Link
        href="/articles"
        className="mt-6 inline-flex items-center gap-2 font-body text-sm font-medium text-pine transition-colors hover:text-brass"
      >
        <ArrowLeft className="h-4 w-4" />
        Tất cả thông báo đấu giá
      </Link>
    </div>
  );
}
