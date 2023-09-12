import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/types/supabase";
import { cookies } from "next/headers";
import { cache } from "react";

export const createServerSupabaseClient = cache(() =>
  createServerComponentClient<Database>({ cookies }),
);

export const getDocumentList = cache(async () => {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });
  return data;
});

export const getOtherDocuments = cache(async (slug: string) => {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .neq("slug", slug);
  return data;
});

export const getDocumentBySlug = cache(async (slug: string) => {
  const supabase = createServerSupabaseClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("slug", slug)
    .single();
  return data;
});
