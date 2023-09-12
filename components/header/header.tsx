import { Button } from '@/components/ui/button';
import { Database } from '@/types/supabase';
import DropdownButton from '@/components/header/dropdown-button';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const Header = async () => {
  const supabase = createServerComponentClient<Database>({cookies});
  const {
    data: {session},
  } = await supabase.auth.getSession();
  return (
    <div className="sticky top-0 z-30 w-full bg-white drop-shadow">
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4 md:px-0">
        <Link href="/">
          <Image
            src="/logo.jpg"
            width={48}
            height={32}
            className="object-contain"
            alt="logo"
          />
        </Link>
        <h1 className="text-center font-bold text-primary">
          CÔNG TY ĐẤU GIÁ HỢP DANH VĨNH YÊN
        </h1>
        {!!session?.user ? (
          <DropdownButton />
        ) : (
          <Link href="/login">
            <Button className="no-wrap text-primary" variant="outline"> Đăng nhập </Button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Header;