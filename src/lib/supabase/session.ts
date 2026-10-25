import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase client bound to the logged-in user's cookies (RLS applies).
export async function createSessionClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => { try { list.forEach(({ name, value, options }) => store.set(name, value, options)); } catch {} },
    },
  });
}

export async function getUser() {
  const supabase = await createSessionClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user };
}
