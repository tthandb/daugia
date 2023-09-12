import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { getDocumentList } from "@/app/supabase-actions";
import Content from "@/app/admin/content";

export default async function Account() {
  const supabase = createServerComponentClient<Database>({ cookies });
  const documents = await getDocumentList();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <main className="flex min-h-screen flex-col bg-gray-100 items-center max-w-5xl mx-auto py-10">
      <Content documents={documents || []} />
    </main>
  );
}
