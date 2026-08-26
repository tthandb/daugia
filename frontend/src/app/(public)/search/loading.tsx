// Skeleton for the search results grid. Deliberately scoped to /search rather
// than the whole (public) group: a loading boundary above a route that calls
// notFound() makes Next stream a 200 shell before the 404 is thrown, turning
// every missing article into a soft 404.
export default function Loading() {
  return (
    <div className="container-wide py-10" aria-hidden>
      <div className="mb-8 space-y-3">
        <div className="h-3 w-28 animate-pulse rounded bg-line" />
        <div className="h-9 w-72 animate-pulse rounded bg-line" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-xl border border-line bg-card"
          >
            <div className="aspect-[16/10] w-full animate-pulse bg-line/60" />
            <div className="space-y-3 p-4">
              <div className="h-4 w-5/6 animate-pulse rounded bg-line" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-line" />
              <div className="mt-4 h-3 w-1/2 animate-pulse rounded bg-line/70" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
