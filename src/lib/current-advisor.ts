import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentAdvisor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? "",
    fullName: profile?.full_name ?? user.email ?? "Advisor",
  };
}
