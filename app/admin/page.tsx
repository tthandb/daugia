import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'
import UploadForm from '@/app/admin/upload-form';
import { Button } from '@/components/ui/button';

export default async function Account() {
  const supabase = createServerComponentClient<Database>({cookies})

  const {
    data: {session},
  } = await supabase.auth.getSession()

  return (
    <main className="flex min-h-screen flex-col items-center max-w-5xl mx-auto py-10">
      <UploadForm />
      <form className="mt-20" action="/auth/signout" method="post">
        <Button variant="destructive" type="submit">
          Sign out
        </Button>
      </form>
    </main>
  )
}