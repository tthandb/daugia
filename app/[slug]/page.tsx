import DocumentList from '@/components/document-list'
import { getDocumentBySlug, getOtherDocuments, preLoadGetDocumentBySlug } from '@/app/supabase-actions'
import { cn } from '@/lib/utils'
import React from 'react'
import Image from 'next/image'
import dayjs from 'dayjs'

export default async function Page({ params }: { params: { slug: string } }) {
  preLoadGetDocumentBySlug(params.slug)
  const document = await getDocumentBySlug(params.slug)
  const others = await getOtherDocuments(params.slug)
  return (
    <div className='relative mb-[200px] mt-[50px] grid grid-cols-9 gap-x-6 px-4'>
      <div className='sticky top-20 col-span-2'>
        <DocumentList title='Các thông báo khác:' className='w-full' data={others as any} />
      </div>
      <div className='col-span-5'>
        <h1 className='scroll-m-20 text-4xl font-bold tracking-tight'>{document?.title}</h1>
        <p
          className='leading-7 [&:not(:first-child)]:mt-6'
          dangerouslySetInnerHTML={{
            __html: document?.description || ''
          }}
        />
        {document?.img_url && (
          <>
            <h2 className='mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0'>
              Hình ảnh
            </h2>
            <div className='mt-2 overflow-hidden rounded-md'>
              <Image
                src={document?.img_url || ''}
                alt={document?.slug || ''}
                width={300}
                height={300}
                className={cn('h-auto w-auto object-cover transition-all hover:scale-105', 'aspect-[3/4]')}
              />
            </div>
          </>
        )}
        <h2 className='mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0'>
          Tài liệu
        </h2>
        <br />
        <br />
        <iframe
          loading='lazy'
          className='h-[1000px] w-full border-4'
          src={`https://docs.google.com/gview?url=${document?.document_url}&embedded=true`}
        />
        <p className='text-md text-right italic leading-7 [&:not(:first-child)]:mt-6'>
          Ngày tạo: {dayjs(document?.created_at).format('DD-MM-YYYY')}.
        </p>
      </div>
    </div>
  )
}
