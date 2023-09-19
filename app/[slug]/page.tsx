import DocumentList from "@/components/document-list"
import { getDocumentBySlug, getOtherDocuments, preLoadGetDocumentBySlug } from "@/app/supabase-actions"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import LoadingIframe from "@/components/loading-iframe"
import React from "react"
import Image from "next/image"
import dayjs from "dayjs"
import { CalendarIcon } from "@radix-ui/react-icons"

export default async function Page({ params }: { params: { slug: string } }) {
  preLoadGetDocumentBySlug(params.slug)
  const document = await getDocumentBySlug(params.slug)
  const others = await getOtherDocuments(params.slug)
  return (
    <div className='relative mb-[200px] grid grid-cols-9 gap-x-6 px-4 pt-[50px]'>
      <div className='col-span-9 md:col-start-3 md:col-end-8'>
        <h1 className='scroll-m-20 text-2xl font-bold tracking-tight'>{document?.title}</h1>
        <p className='text-md flex items-center gap-x-1 leading-7'>
          <CalendarIcon /> {dayjs(document?.created_at).format("DD/MM/YYYY hh:mm")}
        </p>
        <p
          className='leading-7 [&:not(:first-child)]:mt-6'
          dangerouslySetInnerHTML={{
            __html: document?.description || ""
          }}
        />
        {document?.img_url && (
          <>
            <h2 className='mt-10 scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight transition-colors first:mt-0'>
              Hình ảnh
            </h2>
            <div className='mt-2 overflow-hidden rounded-md'>
              <Image
                src={document?.img_url || ""}
                alt={document?.slug || ""}
                width={300}
                height={300}
                className={cn("h-auto w-auto object-cover transition-all hover:scale-105", "aspect-[3/4]")}
              />
            </div>
          </>
        )}
        <h2 className='mt-5 scroll-m-20 border-b pb-2 text-xl font-semibold tracking-tight transition-colors first:mt-0'>
          Thông tin bán đấu giá
        </h2>
        <br />
        <br />
        <LoadingIframe
          skeleton={<Skeleton className='h-[800px] w-full' />}
          className='h-[1000px] w-full border-4'
          src={`https://docs.google.com/gview?url=${document?.document_url}&embedded=true`}
        />
        <DocumentList title='Thông báo khác:' className='mt-10 w-full' data={others as any} />
      </div>
    </div>
  )
}
