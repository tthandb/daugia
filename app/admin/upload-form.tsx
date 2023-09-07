'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea';
import { ChangeEvent, useState } from 'react';
import { Database } from '@/types/supabase';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { convertVietnameseTonesToSlug } from '@/lib/utils';

const MAX_FILE_SIZE = 500000;

const BUCKET = 'daugia'

const FormSchema = z.object({
    title: z.string().min(2, {
      message: 'Title must be at least 2 characters.',
    }),
    description: z.string().min(2, {
      message: 'Description must be at least 2 characters.',
    }),
    file: z.any(),
    image: z.any(),
  },
)

export default function UploadForm() {
  const router = useRouter()

  const [image, setImage] = useState<File>();
  const [document, setDocument] = useState<File>();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  })

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const supabase = createClientComponentClient<Database>()
    let image_url;
    let document_url;
    if (image) {
      document_url = await uploadFile(document, 'document')
      image_url = await uploadFile(image, 'image')
    }

    const {error} = await supabase
      .from('documents')
      .insert([{
        title: data.title,
        description: data.description,
        document_url,
        img_url: image_url,
        slug: convertVietnameseTonesToSlug(data.title),
      }])
    if (!error) {
      router.push('/congratulations')
    }
  }

  async function uploadFile(file: any, category: 'image' | 'document') {
    console.log(file, category)
    const slug = convertVietnameseTonesToSlug(form.getValues('title'))
    const supabase = createClientComponentClient<Database>()
    const filePath = `${category}/${slug}-${new Date().valueOf()}.${file.name.split('.').pop()}`

    const {data, error} = await supabase
      .storage
      .from(BUCKET)
      .upload(filePath, file as any, {
        cacheControl: '3600',
        upsert: false,
      })
    if (error) {
      toast({
        title: 'Lỗi',
        description: `${category} existed`,
        variant: 'destructive',
      })
      return '';
    }
    if (data) {
      const {data} = supabase
        .storage
        .from(BUCKET)
        .getPublicUrl(filePath)
      return data.publicUrl
    }
  }

  const onImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImage(e.target.files[0]);
    }
  };

  const onDocumentChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocument(e.target.files[0]);
    }
  };


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-2/3 flex flex-col gap-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({field}) => (
            <FormItem>
              <FormLabel>Tiêu đề</FormLabel>
              <FormControl>
                <Input placeholder="Tiêu đề" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="file"
          render={({field}) => (
            <FormItem>
              <FormLabel>Tài liệu</FormLabel>
              <FormControl>
                <Input type="file" {...field} onChange={onDocumentChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="image"
          render={({field}) => (
            <FormItem>
              <FormLabel>Ảnh</FormLabel>
              <FormControl>
                <Input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" {...field}
                       onChange={onImageChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({field}) => (
            <FormItem>
              <FormLabel>Nội dung</FormLabel>
              <FormControl>
                <Textarea placeholder="Nội dung" cols={4} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Gửi</Button>
      </form>
      <Toaster />
    </Form>
  )
}
