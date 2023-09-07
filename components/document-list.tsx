import React from 'react';
import Link from 'next/link';
import { Database } from '@/types/supabase';
import dayjs from 'dayjs';

type Document = Database['public']['Tables']['documents']['Row']

const DocumentList = ({data}: { data: Document[] }) => {
  return (
    <div>
      <p className="font-bold text-center">Danh sách thông báo</p>
      <ol
        className="w-full text-sm font-medium bg-white border border-gray-200 rounded-lg">
        {data?.map((e, i) => (
          <Link
            className="block w-full px-4 py-2 cursor-pointer hover:bg-gray-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
            href={`/${e.slug}`} key={i}>
            <div className="grid grid-cols-3 gap-1">
              <p className="col-span-2"> {e.title} </p>
              <p className="col-span-1 text-right"> {dayjs(e.created_at).format('DD-MM-YYYY')} </p>
            </div>
          </Link>
        ))}
      </ol>
    </div>
  );
};

export default DocumentList;