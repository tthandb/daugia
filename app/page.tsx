import DocumentList from '@/components/document-list';
import { getDocumentList } from '@/app/supabase-actions';
import Image from 'next/image';
import React from 'react';

export default async function Home() {
  const documents = await getDocumentList();
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-between py-10">
      <div className="grid w-full grid-cols-3 gap-5">
        <div className="col-span-1">
          <DocumentList title="Danh sách thông báo đấu giá" className="w-full" data={documents as any} />
        </div>
        <div className="col-span-2">
          <Image
            src="/anhcongty.jpg"
            className="object-contain"
            alt="Table Setting"
            width={550}
            height={450}
          />
        </div>
      </div>
    </main>
  );
}
