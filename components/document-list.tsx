import React from 'react';
import Link from 'next/link';
import { Database } from '@/types/supabase';
import dayjs from 'dayjs';

import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Document = Database['public']['Tables']['documents']['Row'];
const DocumentList = ({data, className, title, description}: {
  data: Document[],
  className?: string,
  title?: string,
  description?: string
}) => {
  return (
    <Card className={cn('w-[380px]', className)}>
      <CardHeader>
        {title && <CardTitle className="text-primary">{title}</CardTitle>}
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="grid gap-4">
        <ol>
          {data?.map((e, i) => (
            <Link
              className="grid grid-cols-3 items-start last:mb-0 last:pb-0 w-full p-2 cursor-pointer hover:bg-gray-100 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:text-blue-700"
              href={`/${e.slug}`}
              key={i}
            >
              <p className="text-sm font-medium col-span-2">
                {e.title}
              </p>
              <p className="text-sm text-right text-muted-foreground col-span-1">
                {dayjs(e.created_at).format('DD-MM-YYYY')}{' '}
              </p>
            </Link>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};

export default DocumentList;
