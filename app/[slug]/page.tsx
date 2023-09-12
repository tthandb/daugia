import React from 'react';
import DocumentList from '@/components/document-list';
import { getDocumentBySlug, getOtherDocuments } from '@/app/supabase-actions';
import Image from 'next/image';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';

export default async function Page({params}: { params: { slug: string } }) {
  const document = await getDocumentBySlug(params.slug);
  const others = await getOtherDocuments(params.slug);
  return (
    <div className="grid grid-cols-9 gap-x-6 px-4 mb-[200px] mt-[50px] relative">
      <div className="col-span-2 sticky top-20">
        <DocumentList className="w-full" data={others as any} />
      </div>
      <div className="col-span-5">
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
          {document?.title}
        </h1>
        <p className="leading-7 [&:not(:first-child)]:mt-6">
          {document?.description}
        </p>
        <h2
          className="mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
          Hình ảnh
        </h2>
        <div className="overflow-hidden rounded-md mt-2">
          <Image
            src={document?.img_url || ''}
            alt={document?.slug || ''}
            width={300}
            height={300}
            className={cn(
              'h-auto w-auto object-cover transition-all hover:scale-105',
              'aspect-[3/4]',
            )}
          />
        </div>
        <h2
          className="mt-10 scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight transition-colors first:mt-0">
          Tài liệu
        </h2>
        <br />
        <br />
        <iframe
          className="border-4 w-full h-[1000px]"
          src={`https://docs.google.com/gview?url=${document?.document_url}&embedded=true`}
        />
        <p className="italic leading-7 [&:not(:first-child)]:mt-6 text-right text-md">
          Ngày tạo: {dayjs(document?.created_at).format('DD-MM-YYYY')}.
        </p>
      </div>

    </div>
  );
}
