import React, { cache } from 'react';
import DocumentList from '@/components/document-list';
import { createServerSupabaseClient } from '@/app/supabase-actions';
import Image from 'next/image';

export default async function Page({params}: { params: { slug: string } }) {
  const supabase = createServerSupabaseClient();

  const {data: document} = await supabase
    .from('documents')
    .select('*')
    .eq('slug', params.slug)
    .single()


  const others = await (cache(async () => {
    const {data} = await supabase
      .from('documents')
      .select('*')
      .neq('slug', params.slug)
    return data
  }))()

  return (
    <div>
      <div className="grid grid-cols-9">
        <div className="col-span-2">
          <DocumentList data={others as any} />
        </div>
        <div className="col-span-7 h-screen">
          <h1 className="text-4xl uppercase font-bold">{document?.title}</h1>
          <Image src={document?.img_url || ''} alt={document?.slug || ''} height="300" width="300" />
          <iframe
            className="w-full h-full"
            src={`https://docs.google.com/gview?url=${document?.document_url}&embedded=true`}
          />
        </div>
      </div>
    </div>
  )
}