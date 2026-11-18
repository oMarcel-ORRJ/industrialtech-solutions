import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Role = "ADM" | "Planejador" | "Operador";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function authorize(request: Request): Promise<{ client: SupabaseClient; userId: string } | null> {
  const client = createAdminClient();
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!client || !token) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await client.from("user_profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile?.role !== "ADM") return null;
  return { client, userId: data.user.id };
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (!auth) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  const { data, error } = await auth.client.from("user_profiles").select("id, username, display_name, role, technician_id").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Não foi possível consultar as contas." }, { status: 500 });
  const accounts = (data ?? []).map(account => ({
    id: account.id,
    username: account.username,
    name: account.display_name,
    role: account.role as Role,
    technicianId: account.technician_id ?? undefined
  }));
  return NextResponse.json({ accounts });
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if (!auth) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  const name = String(body.name ?? "").trim();
  const password = String(body.password ?? "");
  const role = body.role as Role;
  const technicianId = body.technicianId ? String(body.technicianId) : null;
  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username) || !name || password.length < 4 || !["Planejador", "Operador"].includes(role)) {
    return NextResponse.json({ error: "Informe usuário válido, nome, senha e nível de acesso." }, { status: 400 });
  }
  if (role === "Operador" && !technicianId) return NextResponse.json({ error: "Vincule o operador a um técnico." }, { status: 400 });
  const { data: duplicate } = await auth.client.from("user_profiles").select("id").ilike("username", username).maybeSingle();
  if (duplicate) return NextResponse.json({ error: "Este nome de usuário já está em uso." }, { status: 409 });

  const email = `${username.toLowerCase()}@industrialtech.local`;
  const { data: created, error: createError } = await auth.client.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { display_name: name } });
  if (createError || !created.user) return NextResponse.json({ error: "Não foi possível criar o usuário. Verifique se o nome já existe." }, { status: 400 });
  const { error: profileError } = await auth.client.from("user_profiles").insert({ id: created.user.id, username, display_name: name, role, technician_id: technicianId });
  if (profileError) {
    await auth.client.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "Não foi possível registrar o perfil da conta." }, { status: 500 });
  }
  return NextResponse.json({ account: { id: created.user.id, username, name, role, technicianId: technicianId ?? undefined } });
}

export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if (!auth) return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || id === auth.userId) return NextResponse.json({ error: "Não é possível remover esta conta." }, { status: 400 });
  const { data: target } = await auth.client.from("user_profiles").select("role").eq("id", id).maybeSingle();
  if (!target || target.role === "ADM") return NextResponse.json({ error: "A conta administrativa fixa não pode ser removida." }, { status: 400 });
  const { error } = await auth.client.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: "Não foi possível remover a conta." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
