import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const adminUsername = "ID_adm";
const adminPassword = "id12345";
const adminEmail = `${adminUsername.toLowerCase()}@industrialtech.local`;

export async function POST(request: Request) {
  const { username, password } = await request.json().catch(() => ({}));
  if (username !== adminUsername || password !== adminPassword) {
    return NextResponse.json({ error: "Credenciais administrativas inválidas." }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "A conexão administrativa com o Supabase não está configurada." }, { status: 503 });
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: existingProfile } = await supabase.from("user_profiles").select("id").eq("username", adminUsername).maybeSingle();
  if (existingProfile) return NextResponse.json({ ready: true });

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: { display_name: "Administrador" }
  });
  if (createError || !created.user) {
    return NextResponse.json({ error: "Não foi possível criar o usuário administrativo. Verifique se já existe uma conta com esse e-mail." }, { status: 500 });
  }

  const { error: profileError } = await supabase.from("user_profiles").insert({
    id: created.user.id,
    username: adminUsername,
    display_name: "Administrador",
    role: "ADM",
    technician_id: null
  });
  if (profileError) {
    await supabase.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "Não foi possível registrar o perfil administrativo." }, { status: 500 });
  }

  return NextResponse.json({ ready: true });
}
