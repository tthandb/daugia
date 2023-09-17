import { Database } from '@/types/supabase'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import React from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import { CalendarIcon } from '@radix-ui/react-icons'

type Document = Database['public']['Tables']['documents']['Row']
const DocumentList = ({
  data,
  className,
  title,
  description
}: {
  data: Document[]
  className?: string
  title?: string
  description?: string
}) => {
  return (
    <Card className={cn('w-[380px]', className)}>
      <CardHeader className='bg-primary py-4'>
        {title && <CardTitle className='font-bold uppercase text-white'>{title}</CardTitle>}
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <Separator />
      <CardContent className='grid gap-4'>
        <ol>
          {data?.map((e, i) => (
            <Link
              className='flex w-full cursor-pointer gap-x-2 p-2 pl-0 last:mb-0 last:pb-0 hover:bg-gray-100 hover:text-blue-700 focus:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700'
              href={`/${e.slug}`}
              key={i}
            >
              <span className='h-2 w-2 translate-y-2 rounded-full bg-primary' />
              <div>
                <p className='line-clamp-3 text-sm font-semibold'>{e.title}</p>
                <p className='flex items-center gap-x-1 text-sm text-muted-foreground'>
                  <CalendarIcon />
                  {dayjs(e.created_at).format('DD/MM/YYYY hh:mm')}
                </p>
              </div>
            </Link>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

export default DocumentList
