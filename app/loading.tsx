import { Skeleton } from "@/components/ui/skeleton"
import React from "react"

function Loading() {
  return (
    <div className='relative mb-[200px] grid grid-cols-9 gap-x-6 px-4 pt-[50px]'>
      <div className='col-span-9 md:col-start-3 md:col-end-8'>
        <Skeleton className='h-[800px]' />
      </div>
    </div>
  )
}

export default Loading
