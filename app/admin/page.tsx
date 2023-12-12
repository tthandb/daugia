import { Database } from "@/types/supabase"
import { Button } from "@/components/ui/button"
import { getDocumentList } from "@/app/supabase-actions"
import Content from "@/app/admin/content"
import { cookies } from "next/headers"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"

export default async function Account() {
  const supabase = createServerComponentClient<Database>({ cookies })
  const documents = await getDocumentList()

  const {
    data: { session }
  } = await supabase.auth.getSession()

  return (
    <main className='mx-auto flex min-h-screen max-w-5xl flex-col items-center bg-gray-100 px-4 py-10'>
      <h1 className='mb-10 scroll-m-20 text-4xl font-extrabold tracking-tight text-primary'>Quản lý bài viết</h1>
      <Content documents={documents || []} />
    </main>
  )
}
