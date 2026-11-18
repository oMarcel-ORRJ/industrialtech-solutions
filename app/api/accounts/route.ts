import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type Role = "ADM" | "Planejador" | "Operador";
type AuthorizationResult =
  | { ok: true; client: SupabaseClient; userId: string }
  | { ok: false; status: number; message: string };

function createAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

async function authorize(request: Request): Promise<AuthorizationResult> {
  const authClient = createAuthClient();
  const adminClient = createAdminClient();
  if (!authClient || !adminClient) {
    return {
      ok: false,
      status: 503,
      message: "A configuração de autenticação e administração do Supabase está incompleta."
    };
  }

  const authorization = request.headers.get("authorization") ?? "";
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!token) {
    return { ok: false, status: 401, message: "Sessão não enviada. Entre novamente no sistema." };
  }

  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  if (authError || !authData.user) {
    console.error("Falha ao validar sessão na API de contas:", authError?.message ?? "Usuário não encontrado");
    return { ok: false, status: 401, message: "Sessão inválida ou expirada. Entre novamente no sistema." };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("user_profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    console.error("Falha ao consultar o perfil administrativo:", profileError.message);
    return { ok: false, status: 500, message: "Não foi possível validar o perfil administrativo." };
  }

  if (profile?.role !== "ADM") {
    return { ok: false, status: 403, message: "Acesso administrativo necessário." };
  }

  return { ok: true, client: adminClient, userId: authData.user.id };
}

function authorizationFailure(auth: Extract<AuthorizationResult, { ok: false }>) {
  return NextResponse.json({ error: auth.message }, { status: auth.status });
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) return authorizationFailure(auth);

  const { data, error } = await auth.client
    .from("user_profiles")
    .select("id, username, display_name, role, technician_id")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Falha ao listar contas:", error.message);
    return NextResponse.json({ error: "Não foi possível consultar as contas." }, { status: 500 });
  }

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
  if (!auth.ok) return authorizationFailure(auth);

  const body = await request.json().catch(() => ({}));
  const username = String(body.username ?? "").trim();
  const name = String(body.name ?? "").trim();
  const password = String(body.password ?? "");
  const role = body.role as Role;
  const technicianId = body.technicianId ? String(body.technicianId) : null;

  if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username) || !name || password.length < 4 || !["Planejador", "Operador"].includes(role)) {
    return NextResponse.json({ error: "Informe usuário válido, nome, senha e nível de acesso." }, { status: 400 });
  }

  if (role === "Operador" && !technicianId) {
    return NextResponse.json({ error: "Vincule o operador a um técnico." }, { status: 400 });
  }

  const { data: duplicate, error: duplicateError } = await auth.client
    .from("user_profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

  if (duplicateError) {
    console.error("Falha ao verificar usuário duplicado:", duplicateError.message);
    return NextResponse.json({ error: "Não foi possível verificar o nome de usuário." }, { status: 500 });
  }

  if (duplicate) {
    return NextResponse.json({ error: "Este nome de usuário já está em uso." }, { status: 409 });
  }

  const email = `${username.toLowerCase()}@industrialtech.local`;
  const { data: created, error: createError } = await auth.client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name }
  });

  if (createError || !created.user) {
    console.error("Falha ao criar usuário no Supabase Auth:", createError?.message ?? "Usuário não retornado");
    return NextResponse.json({ error: "Não foi possível criar o usuário. Verifique se o nome já existe." }, { status: 400 });
  }

  const { error: profileError } = await auth.client.from("user_profiles").insert({
    id: created.user.id,
    username,
    display_name: name,
    role,
    technician_id: technicianId
  });

  if (profileError) {
    console.error("Falha ao criar perfil do usuário:", profileError.message);
    await auth.client.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: "Não foi possível registrar o perfil da conta." }, { status: 500 });
  }

  return NextResponse.json({
    account: { id: created.user.id, username, name, role, technicianId: technicianId ?? undefined }
  });
}

export async function DELETE(request: Request) {
  const auth = await authorize(request);
  if (!auth.ok) return authorizationFailure(auth);

  const id = new URL(request.url).searchParams.get("id");
  if (!id || id === auth.userId) {
    return NextResponse.json({ error: "Não é possível remover esta conta." }, { status: 400 });
  }

  const { data: target, error: targetError } = await auth.client
    .from("user_profiles")
    .select("role")
    .eq("id", id)
    .maybeSingle();

  if (targetError) {
    console.error("Falha ao consultar conta para remoção:", targetError.message);
    return NextResponse.json({ error: "Não foi possível consultar a conta." }, { status: 500 });
  }

  if (!target || target.role === "ADM") {
    return NextResponse.json({ error: "A conta administrativa fixa não pode ser removida." }, { status: 400 });
  }

  const { error } = await auth.client.auth.admin.deleteUser(id);
  if (error) {
    console.error("Falha ao remover conta:", error.message);
    return NextResponse.json({ error: "Não foi possível remover a conta." }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
