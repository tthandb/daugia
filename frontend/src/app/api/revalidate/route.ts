import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

const API_URL = process.env.API_URL || "http://localhost:8080";

/**
 * On-demand cache invalidation, called by the admin after publish/unpublish/
 * delete so public ISR pages update immediately instead of waiting out the
 * revalidate window (and so a 404 cached before publish is cleared).
 *
 * Gated by the admin session: we forward the httpOnly `token` cookie to the Go
 * API's /auth/me and only revalidate for a valid admin. No secret is exposed to
 * the browser, and the action is non-destructive (cache-bust only).
 */
export async function POST(request: Request) {
  const token = cookies().get("token")?.value;
  if (!token) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const me = await fetch(`${API_URL}/api/auth/me`, {
    headers: { cookie: `token=${token}` },
    cache: "no-store",
  }).catch(() => null);
  if (!me || !me.ok) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    slug?: string;
    categorySlug?: string;
  };

  // Always refresh the home and the main listing.
  revalidatePath("/");
  revalidatePath("/articles");
  if (body.slug) revalidatePath(`/articles/${body.slug}`);
  if (body.categorySlug) revalidatePath(`/categories/${body.categorySlug}`);

  return NextResponse.json({ revalidated: true });
}
