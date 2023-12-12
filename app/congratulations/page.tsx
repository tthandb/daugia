import { Button } from "@/components/ui/button"
import React from "react"
import Link from "next/link"

function Page() {
  return (
    <div>
      Congratulations
      <Link href={"/admin"}>
        <Button>Trở về</Button>
      </Link>
    </div>
  )
}

export default Page
