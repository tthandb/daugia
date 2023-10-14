import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

export default async function sitemap() {
  const baseUrl = "https://daugiavinhyen.vercel.app/"
  const supabase = createClientComponentClient()
  const { data: documents } = await supabase.from("documents").select("*").order("created_at", { ascending: false })
  const docUrls =
    documents?.map((post) => ({
      url: `${baseUrl}/${post.slug}`,
      lastModified: post.created_at
    })) || []

  return [{ url: baseUrl, lastModified: new Date() }, ...docUrls]
}
