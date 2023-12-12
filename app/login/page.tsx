import AuthUI from "./auth-ui"

import { Database } from "@/types/supabase"
import { createServerSupabaseClient } from "@/app/supabase-actions"
import { redirect } from "next/navigation"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

async function getSession() {
  const supabase = createServerComponentClient<Database>({ cookies })
  try {
    const {
      data: { session }
    } = await supabase.auth.getSession()
    return session
  } catch (error) {
    console.error("Error:", error)
    return null
  }
}

export default async function SignIn() {
  const session = await getSession()

  if (session) {
    return redirect("/admin")
  }

  return (
    <div className='height-screen-helper flex justify-center'>
      <div className='m-auto flex w-80 max-w-lg flex-col justify-between p-3 '>
        <AuthUI />
      </div>
    </div>
  )
}
