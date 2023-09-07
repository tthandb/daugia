import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { cookies } from 'next/headers';
import { cache } from 'react';

export const createServerSupabaseClient = cache(() =>
  createServerComponentClient<Database>({cookies}),
);
