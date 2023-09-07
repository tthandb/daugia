import Image from 'next/image'
import React, { cache } from 'react';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { cookies } from 'next/headers';
import Link from 'next/link';

export default async function Home() {
  const supabase = createServerComponentClient<Database>({cookies});
  const documents = await (cache(async () => {
    const {data} = await supabase
      .from('documents')
      .select('*')
    return data
  }))()
  return (
    <main className="flex min-h-screen flex-col items-center justify-between max-w-5xl mx-auto py-10">
      <div className="grid grid-cols-3 w-full gap-5">
        <div className="col-span-1">
          <p className="font-bold text-center">Danh sách thông báo</p>
          <ol
            className="w-full text-sm font-medium bg-white border border-gray-200 rounded-lg">
            {documents?.map((e, i) => (
              <Link
                className="block w-full px-4 py-2 cursor-pointer hover:bg-gray-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
                href={`/${e.slug}`} key={i}>- {e.title}</Link>
            ))}
          </ol>
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
  )
}
