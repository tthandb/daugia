import DocumentList from "@/components/document-list"
import { getDocumentList } from "@/app/supabase-actions"
import Image from "next/image"
import React from "react"

export default async function Home() {
  const documents = await getDocumentList()
  return (
    <main className='mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-between px-4 py-10'>
      <div className='relative w-full'>
        <div>
          <DocumentList title='Thông tin bán đấu giá' className='w-full' data={documents as any} />
        </div>
        <div className='relative h-[768px] w-full md:h-[1500px]'>
          <Image src='/anhcongty.jpg' alt='Anh cong ty' fill objectFit='contain' />
        </div>
      </div>
    </main>
  )
}
