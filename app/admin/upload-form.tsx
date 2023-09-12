'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { ReloadIcon } from '@radix-ui/react-icons';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChangeEvent, useState } from 'react';
import { Database } from '@/types/supabase';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { convertVietnameseTonesToSlug } from '@/lib/utils';

type Document = Database['public']['Tables']['documents']['Row'];

const BUCKET = 'daugia';

const FormSchema = z.object({
  title: z.string().min(2, {
    message: 'Title must be at least 2 characters.',
  }),
  description: z.any(),
  file: z.any(),
  image: z.any(),
});

export default function UploadForm({
  document,
  onClose,
}: {
  document?: Document | null;
  onClose?: Function;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<File>();
  const [docFile, setDocFile] = useState<File>();
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: document?.title || '',
      description: document?.description || '',
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    try {
      const slug = convertVietnameseTonesToSlug(data.title)
      setLoading(true);
      const supabase = createClientComponentClient<Database>();
      let img_url;
      let document_url;
      if (docFile) {
        document_url = await uploadFile(docFile, slug, 'document');
      }
      if (image) {
        img_url = await uploadFile(image, slug, 'image');
      }

      if (!document) {
        const {error} = await supabase.from('documents').insert([
          {
            title: data.title,
            description: data.description,
            document_url,
            img_url,
            slug,
          },
        ]);
        if (!error) {
          router.push('/congratulations');
        }
      } else {
        await supabase
          .from('documents')
          .update({
            title: data.title,
            description: data.description,
            slug,
            ...(document_url && {document_url}),
            ...(img_url && {img_url}),
          })
          .eq('slug', document.slug || '');
      }
      onClose?.(false);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: any, slug: string, category: 'image' | 'document') {
    const supabase = createClientComponentClient<Database>();
    const filePath = `${category}/${slug}-${new Date().valueOf()}.${file.name
      .split('.')
      .pop()}`;

    const {data, error} = await supabase.storage
      .from(BUCKET)
      .upload(filePath, file as any, {
        cacheControl: '3600',
        upsert: false,
      });
    if (error) {
      toast({
        title: 'Lỗi',
        description: `${category} existed`,
        variant: 'destructive',
      });
      return '';
    }
    if (data) {
      const {data} = supabase.storage.from(BUCKET).getPublicUrl(filePath);
      return data.publicUrl;
    }
  }

  const onImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImage(e.target.files[0]);
    }
  };

  const onDocumentChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setDocFile(e.target.files[0]);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-y-4"
      >
        <FormField
          disabled={loading}
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
          disabled={loading}
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
          disabled={loading}
          control={form.control}
          name="image"
          render={({field}) => (
            <FormItem>
              <FormLabel>Ảnh</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  {...field}
                  onChange={onImageChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          disabled={loading}
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
        <Button type="submit" disabled={loading}>
          {loading && <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />}
          Gửi
        </Button>
      </form>
      <Toaster />
    </Form>
  );
}
