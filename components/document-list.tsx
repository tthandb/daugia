import { Database } from '@/types/supabase';
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import React from 'react';
import Link from 'next/link';
import dayjs from 'dayjs';


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
              className="grid w-full cursor-pointer grid-cols-3 items-start p-2 last:mb-0 last:pb-0 hover:bg-gray-100 hover:text-blue-700 focus:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700"
              href={`/${e.slug}`}
              key={i}
            >
              <p className="col-span-2 line-clamp-3 text-sm font-medium">
                {e.title}
              </p>
              <p className="col-span-1 text-right text-sm text-muted-foreground">
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
