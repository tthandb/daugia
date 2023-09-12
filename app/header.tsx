import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';
import { cookies } from 'next/headers';
import DropdownButton from '@/components/dropdown-button';

const Header = async () => {
  const supabase = createServerComponentClient<Database>({cookies});
  const {
    data: {session},
  } = await supabase.auth.getSession();
  return (
    <div className="w-full drop-shadow bg-white sticky top-0 z-30">
      <div className="max-w-5xl mx-auto flex justify-between items-center h-12 px-4 md:px-0">
        <Link href="/">
          <Image
            src="/logo.jpg"
            width={48}
            height={32}
            className="object-contain"
            alt="logo"
          />
        </Link>
        <h1 className="w-full text-center font-bold text-primary">
          CÔNG TY ĐẤU GIÁ HỢP DANH VĨNH YÊN
        </h1>
        {!!session?.user ? (
          <DropdownButton />
        ) : (
          <Link href="/login">
            <Button variant="secondary"> Đăng nhập </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Header;