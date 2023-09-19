"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import * as React from "react"
import Link from "next/link"
import { ArchiveIcon, HamburgerMenuIcon } from "@radix-ui/react-icons"

export default function DropdownButton() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline'>
          {" "}
          <HamburgerMenuIcon className='h-4 w-4 text-primary' />{" "}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-56'>
        <DropdownMenuItem>
          <Link className='flex w-full items-center' href='/admin'>
            <ArchiveIcon className='mr-2' />
            Quản lý
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <form className='w-full' action='/api/auth/signout' method='post'>
            <button type='submit' className='w-full'>
              Đăng xuất
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
