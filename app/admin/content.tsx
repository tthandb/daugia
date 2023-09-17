'use client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { DataTable } from '@/app/admin/data-table'
import UploadForm from '@/app/admin/upload-form'
import { Database } from '@/types/supabase'
import { Button } from '@/components/ui/button'
import React, { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import dayjs from 'dayjs'
import Link from 'next/link'

type Document = Database['public']['Tables']['documents']['Row']

function Content({ documents }: { documents: Document[] }) {
  const [open, setOpen] = useState(false)
  const [document, setDocument] = useState<Document | null>()

  const columns: ColumnDef<Document>[] = [
    {
      header: 'Ngày tạo',
      cell: ({ row }) => <p> {dayjs(row.original.created_at).format('DD/MM/YYYY')} </p>
    },
    {
      header: 'Bài viết',
      cell: ({ row }) => {
        const document = row.original
        return (
          <Link className='text-blue-500 underline' href={`/${document.slug}`}>
            {document.title}
          </Link>
        )
      }
    },
    {
      id: 'actions',
      enableHiding: false,
      header: () => (
        <DialogTrigger onClick={() => setDocument(null)}>
          <Button>Thêm</Button>
        </DialogTrigger>
      ),
      cell: ({ row }) => {
        return (
          <DialogTrigger className='flex w-full justify-center' onClick={() => setDocument(row.original)}>
            <Button variant='link'>Sửa</Button>
          </DialogTrigger>
        )
      }
    }
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DataTable columns={columns} data={documents} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className='text-center'>{!!document ? 'Chỉnh sửa' : 'Thêm mới'} bài viết</DialogTitle>
          <DialogDescription>
            <UploadForm onClose={setOpen} document={document} />
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}

export default Content
