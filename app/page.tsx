"use client";

import {
  Activity, AlertCircle, AlertTriangle, ArrowRight, ArrowUpRight, Database,
  Bell, Boxes, CalendarClock, CalendarDays, Check, CheckCircle2, ChevronDown,
  ChevronRight, CircleHelp, ClipboardCheck, ClipboardList, Clock3,
  Cog, Download, Edit3, Factory, FileBarChart2, Filter, Gauge, History,
  LayoutDashboard, LogOut, Menu, MoreHorizontal, Package, PackageCheck, Plus,
  SlidersHorizontal, Trash2, UserRound,
  Users, Wrench, X, Zap
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import type { AppData, Equipment, EquipmentStatus, Intervention, MaintenanceType, OrderStatus, Part, PreventivePlan, Priority, Technician, WorkOrder } from "@/lib/types";
import { createDemoData } from "@/lib/seed";
import { getSupabaseClient } from "@/lib/supabase";
import { emptyData, type ActiveUser, type AppAccount, type AppRole } from "@/lib/types";

type View = "dashboard" | "equipment" | "orders" | "technicians" | "inventory" | "preventive" | "history" | "reports";
type ModalType = "equipment" | "technician" | "order" | "part" | "plan" | "intervention" | "consumePart" | "orderDetails" | "equipmentDetails";
type ModalState = { type: ModalType; id?: string; parentId?: string };
type ToastState = { message: string; kind: "success" | "error" | "info" } | null;
type FormValues = Record<string, string>;
const ADMIN_USERNAME = "ID_adm";
const ADMIN_PASSWORD = "id12345";
const LOCAL_DATA_KEY = "industrialtech-workspace-local";
const LOCAL_ACCOUNTS_KEY = "industrialtech-accounts";
const LOCAL_SESSION_KEY = "industrialtech-session";
const LOCAL_MODE = process.env.NEXT_PUBLIC_DATA_MODE !== "cloud";

const navGroups = [
  { label: "VISÃO GERAL", items: [{ id: "dashboard" as View, label: "Dashboard", icon: LayoutDashboard }] },
  { label: "OPERAÇÃO", items: [
    { id: "equipment" as View, label: "Equipamentos", icon: Factory },
    { id: "orders" as View, label: "Ordens de serviço", icon: ClipboardList },
    { id: "preventive" as View, label: "Plano preventivo", icon: CalendarClock }
  ] },
  { label: "RECURSOS", items: [
    { id: "technicians" as View, label: "Técnicos", icon: Users },
    { id: "inventory" as View, label: "Estoque de peças", icon: Boxes }
  ] },
  { label: "ANÁLISE", items: [
    { id: "history" as View, label: "Histórico", icon: History },
    { id: "reports" as View, label: "Indicadores", icon: FileBarChart2 }
  ] }
];

const todayISO = () => { const now = new Date(); const year = now.getFullYear(); const month = String(now.getMonth() + 1).padStart(2, "0"); const day = String(now.getDate()).padStart(2, "0"); return `${year}-${month}-${day}`; };
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const fmtDate = (value?: string) => value ? new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
};
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const isOpenOrder = (status: OrderStatus) => status !== "Concluída" && status !== "Cancelada";

function statusClass(status: string) {
  const value = status.toLowerCase();
  if (value.includes("operacional") || value.includes("concluída") || value.includes("disponível") || value.includes("programada")) return "status status-green";
  if (value.includes("atenção") || value.includes("andamento") || value.includes("média") || value.includes("serviço")) return "status status-amber";
  if (value.includes("parado") || value.includes("crítica") || value.includes("atrasada") || value.includes("afastado") || value.includes("cancelada")) return "status status-red";
  if (value.includes("manutenção") || value.includes("peças") || value.includes("aberta") || value.includes("alta")) return "status status-blue";
  return "status status-neutral";
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`brand-lockup ${compact ? "brand-compact" : ""}`}>
      <div className="brand-symbol"><span>i</span><span>t</span><i /></div>
      {!compact && <div className="brand-wordmark"><strong>industrial<span>tech</span></strong><small>SOLUTIONS</small></div>}
    </div>
  );
}

function Avatar({ name, size = "normal" }: { name: string; size?: "small" | "normal" | "large" }) {
  const palette = ["avatar-teal", "avatar-violet", "avatar-blue", "avatar-orange", "avatar-rose"];
  const index = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % palette.length;
  return <span className={`avatar ${palette[index]} avatar-${size}`}>{initials(name)}</span>;
}

function EmptyState({ icon: Icon, title, description, action }: { icon: typeof ClipboardList; title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon size={22} /></div><strong>{title}</strong><p>{description}</p>{action}</div>;
}

function Field({ label, children, wide = false, hint }: { label: string; children: ReactNode; wide?: boolean; hint?: string }) {
  return <label className={`form-field ${wide ? "field-wide" : ""}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function LoginScreen({ onLogin, busy, message }: { onLogin: (username: string, password: string) => void; busy: boolean; message: string }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <BrandMark />
        <div className="auth-card-kicker">SISTEMA DE GESTÃO DE MANUTENÇÃO</div>
        <h1>Acessar o sistema</h1>
        <p>Informe seu usuário e sua senha para continuar.</p>
        <form onSubmit={event => { event.preventDefault(); onLogin(username.trim(), password); }}>
          <Field label="Usuário"><input autoComplete="username" value={username} onChange={event => setUsername(event.target.value)} placeholder="Seu usuário" required /></Field>
          <Field label="Senha"><input autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Sua senha" required /></Field>
          {message && <div className="auth-message"><AlertCircle size={15} />{message}</div>}
          <button className="button button-primary button-full" disabled={busy}>{busy ? <span className="spinner" /> : "Entrar"}<ArrowRight size={16} /></button>
        </form>
      </div>
    </main>
  );
}

export default function Home() {
  const [data, setData] = useState<AppData>(emptyData);
  const [view, setView] = useState<View>("dashboard");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<FormValues>({});
  const [toast, setToast] = useState<ToastState>(null);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [accounts, setAccounts] = useState<AppAccount[]>([]);
  const [orderFilter, setOrderFilter] = useState("Todas");
  const [equipmentFilter, setEquipmentFilter] = useState("Todos");
  const [historyFilter, setHistoryFilter] = useState("Todos");
  const [cloudReady, setCloudReady] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [user, setUser] = useState<ActiveUser | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const supabaseRef = useRef<ReturnType<typeof getSupabaseClient>>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notify = useCallback((message: string, kind: "success" | "error" | "info" = "success") => {
    setToast({ message, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const hydrateCloud = useCallback(async (activeUser: { id: string; email?: string | null }, db: NonNullable<ReturnType<typeof getSupabaseClient>>) => {
    setCloudReady(false);
    const { data: profile, error: profileError } = await db.from("user_profiles").select("username, display_name, role, technician_id").eq("id", activeUser.id).single();
    if (profileError || !profile) {
      setAuthMessage("O perfil desta conta não foi localizado. Solicite ao administrador a revisão do acesso.");
      await db.auth.signOut();
      setAppReady(true);
      setCloudReady(true);
      return;
    }
    const { data: row, error } = await db.from("industrial_workspace").select("payload").eq("id", 1).maybeSingle();
    if (error) {
      setAuthMessage("Não foi possível carregar os dados do sistema.");
      setAppReady(true);
      setCloudReady(true);
      return;
    }
    if (row?.payload) {
      setData(row.payload as AppData);
    } else {
      setData(emptyData);
      const { error: insertError } = await db.from("industrial_workspace").upsert({ id: 1, payload: emptyData, updated_at: new Date().toISOString() });
      if (insertError) notify("Não foi possível inicializar o banco de dados.", "error");
    }
    setUser({
      id: activeUser.id,
      username: profile.username,
      name: profile.display_name,
      role: profile.role as AppRole,
      technicianId: profile.technician_id ?? undefined
    });
    setView(profile.role === "Operador" ? "orders" : "dashboard");
    setAuthMessage("");
    setCloudReady(true);
    setAppReady(true);
  }, [notify]);

  useEffect(() => {
    if (LOCAL_MODE) {
      try {
        const storedData = localStorage.getItem(LOCAL_DATA_KEY);
        const storedAccounts = localStorage.getItem(LOCAL_ACCOUNTS_KEY);
        const storedSession = sessionStorage.getItem(LOCAL_SESSION_KEY);
        if (storedData) setData(JSON.parse(storedData) as AppData);
        if (storedAccounts) setAccounts(JSON.parse(storedAccounts) as AppAccount[]);
        if (storedSession) {
          const session = JSON.parse(storedSession) as ActiveUser;
          if (session.role === "ADM" && session.username === ADMIN_USERNAME) {
            setUser(session);
            setView("dashboard");
          }
          else {
            const localAccount = storedAccounts ? (JSON.parse(storedAccounts) as AppAccount[]).find(account => account.id === session.id) : undefined;
            if (localAccount) {
              setUser({ id: localAccount.id, username: localAccount.username, name: localAccount.name, role: localAccount.role, technicianId: localAccount.technicianId });
              setView(localAccount.role === "Operador" ? "orders" : "dashboard");
            }
          }
        }
      } catch {
        setData(emptyData);
        setAccounts([]);
        sessionStorage.removeItem(LOCAL_SESSION_KEY);
      }
      setAppReady(true);
      return;
    }
    const db = getSupabaseClient();
    supabaseRef.current = db;
    if (!db) {
      setAuthMessage("A conexão com o banco ainda não foi configurada.");
      setAppReady(true);
      return;
    }
    const initialize = async () => {
      const { data: sessionData } = await db.auth.getSession();
      if (sessionData.session?.user) await hydrateCloud(sessionData.session.user, db);
      else setAppReady(true);
    };
    void initialize();
    const { data: listener } = db.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        window.setTimeout(() => { void hydrateCloud(session.user, db); }, 0);
      } else {
        setUser(null);
        setCloudReady(false);
        setData(emptyData);
        setAppReady(true);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [hydrateCloud]);

  useEffect(() => {
    if (!appReady) return;
    if (LOCAL_MODE) {
      localStorage.setItem(LOCAL_DATA_KEY, JSON.stringify(data));
      return;
    }
    if (!user || !cloudReady || !supabaseRef.current) return;
    const timer = setTimeout(async () => {
      const { error } = await supabaseRef.current!.from("industrial_workspace").upsert({ id: 1, payload: data, updated_at: new Date().toISOString() });
      if (error) notify("Falha ao sincronizar os dados. Verifique sua conexão.", "error");
    }, 700);
    return () => clearTimeout(timer);
  }, [data, appReady, cloudReady, user, notify]);

  const equipmentById = useMemo(() => Object.fromEntries(data.equipment.map(item => [item.id, item])) as Record<string, Equipment>, [data.equipment]);
  const technicianById = useMemo(() => Object.fromEntries(data.technicians.map(item => [item.id, item])) as Record<string, Technician>, [data.technicians]);
  const partById = useMemo(() => Object.fromEntries(data.parts.map(item => [item.id, item])) as Record<string, Part>, [data.parts]);
  const overduePlans = data.plans.filter(plan => plan.status !== "Suspensa" && plan.nextDate < todayISO());
  const dueSoonPlans = data.plans.filter(plan => plan.status !== "Suspensa" && plan.nextDate >= todayISO() && plan.nextDate <= addDays(todayISO(), 7));
  const lowStockParts = data.parts.filter(part => part.stock <= part.minStock);
  const activeNotifications = overduePlans.length + dueSoonPlans.length + lowStockParts.length;
  const pageTitle: Record<View, string> = { dashboard: "Visão geral", equipment: "Equipamentos", orders: "Ordens de serviço", technicians: "Técnicos", inventory: "Estoque de peças", preventive: "Plano preventivo", history: "Histórico de manutenção", reports: "Indicadores" };
  const isAdmin = user?.role === "ADM";
  const isOperator = user?.role === "Operador";
  const canManage = isAdmin || user?.role === "Planejador";
  const visibleOrders = data.orders.filter(order => !isOperator || order.technicianId === user?.technicianId);
  const openOrders = visibleOrders.filter(order => isOpenOrder(order.status));
  const allowedViews: View[] = isOperator ? ["orders", "equipment", "history"] : ["dashboard", "equipment", "orders", "technicians", "inventory", "preventive", "history", "reports"];
  const visibleNavGroups = navGroups.map(group => ({ ...group, items: group.items.filter(item => allowedViews.includes(item.id)) })).filter(group => group.items.length > 0);

  const updateForm = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));
  const openModal = (type: ModalType, id?: string, parentId?: string) => {
    let initial: FormValues = {};
    if (id && type === "equipment") {
      const item = data.equipment.find(value => value.id === id);
      if (item) initial = Object.fromEntries(Object.entries(item).map(([key, value]) => [key, String(value ?? "")]));
    } else if (id && type === "technician") {
      const item = data.technicians.find(value => value.id === id);
      if (item) initial = Object.fromEntries(Object.entries(item).map(([key, value]) => [key, String(value ?? "")]));
    } else if (id && type === "order") {
      const item = data.orders.find(value => value.id === id);
      if (item) initial = Object.fromEntries(Object.entries(item).filter(([key]) => !["partsUsed", "interventions"].includes(key)).map(([key, value]) => [key, String(value ?? "")]));
    } else if (id && type === "part") {
      const item = data.parts.find(value => value.id === id);
      if (item) initial = Object.fromEntries(Object.entries(item).map(([key, value]) => [key, String(value ?? "")]));
    } else if (id && type === "plan") {
      const item = data.plans.find(value => value.id === id);
      if (item) initial = Object.fromEntries(Object.entries(item).map(([key, value]) => [key, String(value ?? "")]));
    }
    if (type === "order") {
      initial = { type: "Corretiva", priority: "Média", status: "Aberta", openedAt: todayISO(), dueDate: addDays(todayISO(), 2), estimatedHours: "2", actualHours: "0", ...initial };
      if (!id) initial.technicianId = data.technicians.find(item => item.status !== "Afastado")?.id ?? "";
      if (!id) initial.equipmentId = data.equipment[0]?.id ?? "";
    }
    if (type === "equipment") initial = { criticality: "Média", status: "Operacional", installedAt: todayISO(), nextMaintenance: addDays(todayISO(), 30), ...initial };
    if (type === "technician") initial = { role: "Técnico de Manutenção", status: "Disponível", specialty: "Mecânica", ...initial };
    if (type === "part") initial = { category: "Geral", stock: "0", minStock: "0", unit: "un", cost: "0", location: "Almoxarifado", ...initial };
    if (type === "plan") initial = { frequencyDays: "30", lastDate: todayISO(), nextDate: addDays(todayISO(), 30), status: "Programada", technicianId: data.technicians[0]?.id ?? "", equipmentId: data.equipment[0]?.id ?? "", ...initial };
    if (type === "intervention") initial = { date: todayISO(), hours: "1", description: "" };
    if (type === "consumePart") initial = { partId: data.parts[0]?.id ?? "", quantity: "1" };
    setForm(initial);
    setModal({ type, id, parentId });
  };

  const nextOrderNumber = () => {
    const currentYear = new Date().getFullYear();
    const max = data.orders.reduce((highest, order) => {
      const value = Number(order.number.split("-").at(-1));
      return Number.isFinite(value) ? Math.max(highest, value) : highest;
    }, 0);
    return `OS-${currentYear}-${String(max + 1).padStart(4, "0")}`;
  };

  const saveModal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!modal) return;
    const values = form;
    if (modal.type === "equipment") {
      if (!values.name?.trim() || !values.code?.trim()) return notify("Informe o nome e o código do equipamento.", "error");
      const item: Equipment = { id: modal.id ?? uid("eq"), code: values.code.trim(), name: values.name.trim(), category: values.category || "Geral", sector: values.sector || "Não informado", manufacturer: values.manufacturer || "—", model: values.model || "—", serial: values.serial || "—", criticality: (values.criticality || "Média") as Priority, status: (values.status || "Operacional") as EquipmentStatus, installedAt: values.installedAt || todayISO(), nextMaintenance: values.nextMaintenance || addDays(todayISO(), 30), notes: values.notes || "" };
      setData(current => ({ ...current, equipment: modal.id ? current.equipment.map(existing => existing.id === modal.id ? item : existing) : [item, ...current.equipment] }));
      notify(modal.id ? "Equipamento atualizado." : "Equipamento cadastrado.");
    }
    if (modal.type === "technician") {
      if (!values.name?.trim()) return notify("Informe o nome do técnico.", "error");
      const item: Technician = { id: modal.id ?? uid("tec"), name: values.name.trim(), role: values.role || "Técnico de Manutenção", specialty: values.specialty || "Geral", status: (values.status || "Disponível") as Technician["status"] };
      setData(current => ({ ...current, technicians: modal.id ? current.technicians.map(existing => existing.id === modal.id ? item : existing) : [item, ...current.technicians] }));
      notify(modal.id ? "Técnico atualizado." : "Técnico cadastrado.");
    }
    if (modal.type === "order") {
      if (!values.title?.trim() || !values.equipmentId) return notify("Informe o serviço e o equipamento.", "error");
      const previous = modal.id ? data.orders.find(item => item.id === modal.id) : undefined;
      const status = (values.status || "Aberta") as OrderStatus;
      const item: WorkOrder = { id: modal.id ?? uid("os"), number: previous?.number ?? nextOrderNumber(), equipmentId: values.equipmentId, title: values.title.trim(), description: values.description || "", type: (values.type || "Corretiva") as MaintenanceType, priority: (values.priority || "Média") as Priority, status, technicianId: values.technicianId || "", openedAt: values.openedAt || todayISO(), dueDate: values.dueDate || addDays(todayISO(), 2), completedAt: status === "Concluída" ? (previous?.completedAt || todayISO()) : "", estimatedHours: Number(values.estimatedHours || 0), actualHours: Number(values.actualHours || 0), failureCause: values.failureCause || "", partsUsed: previous?.partsUsed ?? [], interventions: previous?.interventions ?? [] };
      setData(current => ({ ...current, orders: modal.id ? current.orders.map(existing => existing.id === modal.id ? item : existing) : [item, ...current.orders], equipment: current.equipment.map(equipment => equipment.id === item.equipmentId && isOpenOrder(status) ? { ...equipment, status: "Em manutenção" } : equipment.id === item.equipmentId && status === "Concluída" ? { ...equipment, status: "Operacional" } : equipment) }));
      notify(modal.id ? "Ordem de serviço atualizada." : `Ordem ${item.number} criada.`);
    }
    if (modal.type === "part") {
      if (!values.name?.trim() || !values.code?.trim()) return notify("Informe o nome e o código da peça.", "error");
      const item: Part = { id: modal.id ?? uid("part"), code: values.code.trim(), name: values.name.trim(), category: values.category || "Geral", stock: Number(values.stock || 0), minStock: Number(values.minStock || 0), unit: values.unit || "un", cost: Number(values.cost || 0), location: values.location || "Almoxarifado" };
      setData(current => ({ ...current, parts: modal.id ? current.parts.map(existing => existing.id === modal.id ? item : existing) : [item, ...current.parts] }));
      notify(modal.id ? "Peça atualizada." : "Peça cadastrada.");
    }
    if (modal.type === "plan") {
      if (!values.title?.trim() || !values.equipmentId) return notify("Informe o plano e o equipamento.", "error");
      const item: PreventivePlan = { id: modal.id ?? uid("plan"), equipmentId: values.equipmentId, title: values.title.trim(), frequencyDays: Number(values.frequencyDays || 30), lastDate: values.lastDate || todayISO(), nextDate: values.nextDate || addDays(todayISO(), Number(values.frequencyDays || 30)), technicianId: values.technicianId || "", status: (values.status || "Programada") as PreventivePlan["status"] };
      setData(current => ({ ...current, plans: modal.id ? current.plans.map(existing => existing.id === modal.id ? item : existing) : [item, ...current.plans] }));
      notify(modal.id ? "Plano atualizado." : "Plano preventivo cadastrado.");
    }
    if (modal.type === "intervention" && modal.parentId) {
      const hours = Number(values.hours || 0);
      if (!values.description?.trim() || hours <= 0) return notify("Informe a descrição e as horas da intervenção.", "error");
      const intervention: Intervention = { id: uid("int"), date: values.date || todayISO(), technicianId: data.orders.find(item => item.id === modal.parentId)?.technicianId ?? "", description: values.description.trim(), hours };
      setData(current => ({ ...current, orders: current.orders.map(item => item.id === modal.parentId ? { ...item, interventions: [...item.interventions, intervention], actualHours: item.actualHours + hours, status: item.status === "Aberta" ? "Em andamento" : item.status } : item) }));
      notify("Intervenção registrada no histórico da OS.");
    }
    if (modal.type === "consumePart" && modal.parentId) {
      const quantity = Number(values.quantity || 0);
      const part = data.parts.find(item => item.id === values.partId);
      if (!part || quantity <= 0) return notify("Selecione uma peça e informe uma quantidade válida.", "error");
      if (quantity > part.stock) return notify(`Estoque insuficiente. Disponível: ${part.stock} ${part.unit}.`, "error");
      setData(current => ({ ...current, parts: current.parts.map(item => item.id === part.id ? { ...item, stock: item.stock - quantity } : item), orders: current.orders.map(order => order.id === modal.parentId ? { ...order, partsUsed: [...order.partsUsed, { partId: part.id, quantity }] } : order) }));
      notify(`${quantity} ${part.unit} de ${part.name} vinculada(s) à ordem.`);
    }
    setModal(null);
  };

  const changeOrderStatus = (order: WorkOrder, status: OrderStatus) => {
    setData(current => ({ ...current, orders: current.orders.map(item => item.id === order.id ? { ...item, status, completedAt: status === "Concluída" ? todayISO() : "" } : item), equipment: current.equipment.map(item => item.id === order.equipmentId ? { ...item, status: status === "Concluída" ? "Operacional" : status === "Cancelada" ? item.status : "Em manutenção" } : item) }));
    notify(`OS ${order.number}: ${status.toLowerCase()}.`);
  };

  const completePlan = (plan: PreventivePlan) => {
    const next = addDays(todayISO(), plan.frequencyDays);
    const newOrder: WorkOrder = { id: uid("os"), number: nextOrderNumber(), equipmentId: plan.equipmentId, title: plan.title, description: `Ordem gerada a partir do plano preventivo. Frequência: ${plan.frequencyDays} dias.`, type: "Preventiva", priority: "Média", status: "Concluída", technicianId: plan.technicianId, openedAt: todayISO(), dueDate: todayISO(), completedAt: todayISO(), estimatedHours: 0, actualHours: 0.5, failureCause: "", partsUsed: [], interventions: [{ id: uid("int"), date: todayISO(), technicianId: plan.technicianId, description: "Execução preventiva registrada pelo plano de manutenção.", hours: 0.5 }] };
    setData(current => ({ ...current, plans: current.plans.map(item => item.id === plan.id ? { ...item, lastDate: todayISO(), nextDate: next, status: "Programada" } : item), orders: [newOrder, ...current.orders] }));
    notify(`Preventiva concluída. Próxima execução: ${fmtDate(next)}.`);
  };

  const deleteRecord = (kind: "equipment" | "technician" | "order" | "part" | "plan", id: string) => {
    const labels = { equipment: "equipamento", technician: "técnico", order: "ordem de serviço", part: "peça", plan: "plano" };
    if (!window.confirm(`Deseja realmente excluir este registro (${labels[kind]})?`)) return;
    if (kind === "equipment") setData(current => ({ ...current, equipment: current.equipment.filter(item => item.id !== id) }));
    if (kind === "technician") setData(current => ({ ...current, technicians: current.technicians.filter(item => item.id !== id) }));
    if (kind === "order") setData(current => ({ ...current, orders: current.orders.filter(item => item.id !== id) }));
    if (kind === "part") setData(current => ({ ...current, parts: current.parts.filter(item => item.id !== id) }));
    if (kind === "plan") setData(current => ({ ...current, plans: current.plans.filter(item => item.id !== id) }));
    notify("Registro excluído.", "info");
  };

  const doLogin = async (username: string, password: string) => {
    setAuthBusy(true);
    setAuthMessage("");
    if (LOCAL_MODE) {
      let activeUser: ActiveUser | null = null;
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        activeUser = { id: "local-admin", username: ADMIN_USERNAME, name: "Administrador", role: "ADM" };
      } else {
        const account = accounts.find(item => item.username.toLowerCase() === username.toLowerCase() && item.password === password);
        if (account) activeUser = { id: account.id, username: account.username, name: account.name, role: account.role, technicianId: account.technicianId };
      }
      if (!activeUser) {
        setAuthMessage("Usuário ou senha inválidos.");
        setAuthBusy(false);
        return;
      }
      sessionStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(activeUser));
      setUser(activeUser);
      setView(activeUser.role === "Operador" ? "orders" : "dashboard");
      setAuthBusy(false);
      return;
    }
    const db = supabaseRef.current;
    if (!db) {
      setAuthMessage("A conexão com o Supabase não está configurada.");
      setAuthBusy(false);
      return;
    }
    if (username === ADMIN_USERNAME) {
      const bootstrap = await fetch("/api/bootstrap-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (!bootstrap.ok) {
        setAuthMessage("Não foi possível inicializar a conta administrativa.");
        setAuthBusy(false);
        return;
      }
    }
    const email = `${username.toLowerCase()}@industrialtech.local`;
    const result = await db.auth.signInWithPassword({ email, password });
    if (result.error) {
      setAuthMessage("Usuário ou senha inválidos.");
    } else if (result.data.user) {
      await hydrateCloud(result.data.user, db);
      setView("dashboard");
    }
    setAuthBusy(false);
  };

  const signOut = async () => {
    if (LOCAL_MODE) sessionStorage.removeItem(LOCAL_SESSION_KEY);
    else if (supabaseRef.current) await supabaseRef.current.auth.signOut();
    setUser(null);
    if (!LOCAL_MODE) setData(emptyData);
    setView("dashboard");
    setAccountsOpen(false);
    setAuthMessage("");
    notify("Sessão encerrada.", "info");
  };

  const loadAccounts = async () => {
    if (!user || user.role !== "ADM") return;
    if (LOCAL_MODE) {
      setAccountsOpen(true);
      return;
    }
    const session = await supabaseRef.current?.auth.getSession();
    const token = session?.data.session?.access_token;
    if (!token) return notify("Sessão inválida. Entre novamente.", "error");
    const response = await fetch("/api/accounts", { headers: { Authorization: `Bearer ${token}` } });
    const result = await response.json();
    if (!response.ok) return notify(result.error ?? "Não foi possível carregar as contas.", "error");
    setAccounts(result.accounts as AppAccount[]);
    setAccountsOpen(true);
  };

  const createAccount = async (account: Omit<AppAccount, "id">) => {
    if (!user || user.role !== "ADM") return;
    setAccountBusy(true);
    if (LOCAL_MODE) {
      const exists = accounts.some(item => item.username.toLowerCase() === account.username.toLowerCase());
      if (account.username.toLowerCase() === ADMIN_USERNAME.toLowerCase() || exists) {
        notify("Este nome de usuário já está em uso.", "error");
        setAccountBusy(false);
        return;
      }
      const updated = [{ ...account, id: uid("user") }, ...accounts];
      setAccounts(updated);
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(updated));
      notify("Conta criada com sucesso.");
      setAccountBusy(false);
      return;
    }
    const session = await supabaseRef.current?.auth.getSession();
    const token = session?.data.session?.access_token;
    const response = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token ?? ""}` },
      body: JSON.stringify(account)
    });
    const result = await response.json();
    if (!response.ok) notify(result.error ?? "Não foi possível criar a conta.", "error");
    else {
      setAccounts(current => [result.account as AppAccount, ...current]);
      notify("Conta criada com sucesso.");
    }
    setAccountBusy(false);
  };

  const deleteAccount = async (account: AppAccount) => {
    if (!user || user.role !== "ADM") return;
    if (!window.confirm(`Excluir o acesso de ${account.name}?`)) return;
    setAccountBusy(true);
    if (LOCAL_MODE) {
      const updated = accounts.filter(item => item.id !== account.id);
      setAccounts(updated);
      localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(updated));
      notify("Conta removida.", "info");
      setAccountBusy(false);
      return;
    }
    const session = await supabaseRef.current?.auth.getSession();
    const token = session?.data.session?.access_token;
    const response = await fetch(`/api/accounts?id=${encodeURIComponent(account.id)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token ?? ""}` } });
    const result = await response.json();
    if (!response.ok) notify(result.error ?? "Não foi possível remover a conta.", "error");
    else {
      setAccounts(current => current.filter(item => item.id !== account.id));
      notify("Conta removida.", "info");
    }
    setAccountBusy(false);
  };

  const fillDemoData = () => {
    if (user?.role !== "ADM") return;
    if (!window.confirm("Substituir os dados atuais pelos dados fictícios de demonstração?")) return;
    setData(createDemoData());
    notify("Dados fictícios carregados.");
  };

  const clearAllData = () => {
    if (user?.role !== "ADM") return;
    if (!window.confirm("Remover todos os equipamentos, ordens, técnicos, peças e planos? Esta ação não pode ser desfeita.")) return;
    setData(emptyData);
    notify("Todos os dados operacionais foram removidos.", "info");
  };

  const navTo = (target: View) => { setView(target); setSidebarOpen(false); };
  const operatorOrderIds = visibleOrders.map(item => item.equipmentId);
  const visibleEquipment = data.equipment.filter(item => !isOperator || operatorOrderIds.includes(item.id));
  const filteredEquipment = visibleEquipment.filter(item => equipmentFilter === "Todos" || item.status === equipmentFilter);
  const filteredOrders = visibleOrders.filter(item => orderFilter === "Todas" || item.status === orderFilter);
  const filteredTechnicians = data.technicians;
  const filteredParts = data.parts;
  const filteredHistory = visibleOrders.filter(item => item.status === "Concluída" && (historyFilter === "Todos" || item.type === historyFilter));

  if (!appReady) return <div className="loading-screen"><BrandMark /><div className="spinner spinner-dark" /><span>Preparando seu ambiente de trabalho...</span></div>;
  if (!user) return <LoginScreen onLogin={(username, password) => void doLogin(username, password)} busy={authBusy} message={authMessage} />;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand"><BrandMark /><button className="mobile-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div>
        <nav className="sidebar-nav">
          {visibleNavGroups.map(group => <div className="nav-group" key={group.label}><div className="nav-caption">{group.label}</div>{group.items.map(item => <button key={item.id} className={`nav-link ${view === item.id ? "nav-link-active" : ""}`} onClick={() => navTo(item.id)}><item.icon size={18} strokeWidth={1.8} /><span>{item.label}</span>{item.id === "orders" && openOrders.length > 0 && <b className="nav-count">{openOrders.length}</b>}</button>)}</div>)}
        </nav>
        <div className="sidebar-bottom">
          {isAdmin && <div className="admin-tools">
            <button className="nav-link" onClick={() => void loadAccounts()}><Users size={17} /><span>Contas de acesso</span></button>
            <button className="nav-link" onClick={fillDemoData}><Database size={17} /><span>Preencher dados fictícios</span></button>
            <button className="nav-link admin-clear" onClick={clearAllData}><Trash2 size={17} /><span>Limpar dados operacionais</span></button>
          </div>}
          <div className="sidebar-user"><div className="sidebar-user-info"><strong>{user.name}</strong><small>{user.role}</small></div><button onClick={() => void signOut()} title="Sair"><LogOut size={16} /></button></div>
        </div>
      </aside>
      {sidebarOpen && <button className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Fechar menu" />}

      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-left"><button className="mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>IndustrialTech</span><ChevronRight size={14} /><strong>{pageTitle[view]}</strong></div></div>
          <div className="topbar-actions">
            {!isOperator && <div className="popover-anchor"><button className={`icon-button notification-button ${noticeOpen ? "icon-button-active" : ""}`} onClick={() => setNoticeOpen(!noticeOpen)} aria-label="Notificações"><Bell size={18} />{activeNotifications > 0 && <i />}</button>{noticeOpen && <div className="notification-popover"><div className="popover-head"><div><strong>Central de alertas</strong><small>{activeNotifications} itens que merecem atenção</small></div><button onClick={() => setNoticeOpen(false)}><X size={16} /></button></div><div className="notice-list">{overduePlans.map(plan => <button key={plan.id} className="notice-item" onClick={() => { navTo("preventive"); setNoticeOpen(false); }}><span className="notice-dot notice-red"><AlertTriangle size={14} /></span><span><strong>Preventiva atrasada</strong><small>{plan.title} • {equipmentById[plan.equipmentId]?.name}</small></span><em>{fmtDate(plan.nextDate)}</em></button>)}{dueSoonPlans.map(plan => <button key={plan.id} className="notice-item" onClick={() => { navTo("preventive"); setNoticeOpen(false); }}><span className="notice-dot notice-amber"><CalendarClock size={14} /></span><span><strong>Preventiva próxima</strong><small>{plan.title} • {equipmentById[plan.equipmentId]?.name}</small></span><em>{fmtDate(plan.nextDate)}</em></button>)}{lowStockParts.map(part => <button key={part.id} className="notice-item" onClick={() => { navTo("inventory"); setNoticeOpen(false); }}><span className="notice-dot notice-blue"><Package size={14} /></span><span><strong>Estoque baixo</strong><small>{part.name} • saldo {part.stock} {part.unit}</small></span><em>Repor</em></button>)}{activeNotifications === 0 && <div className="notice-empty"><CheckCircle2 size={20} />Tudo em dia por aqui.</div>}</div></div>}</div>}
          </div>
        </header>

        <div className="page-content">
          {view === "dashboard" && <Dashboard data={data} equipmentById={equipmentById} technicianById={technicianById} lowStockParts={lowStockParts} overduePlans={overduePlans} dueSoonPlans={dueSoonPlans} onNavigate={navTo} onOpenOrder={id => openModal("orderDetails", id)} onNewOrder={() => openModal("order")} />}

          {view === "equipment" && <>
            <PageHeading eyebrow="GESTÃO DE ATIVOS" title="Equipamentos" description="Cadastre e acompanhe as máquinas e equipamentos da operação." action={canManage ? <button className="button button-primary" onClick={() => openModal("equipment")}><Plus size={16} /> Novo equipamento</button> : undefined} />
            <div className="mini-stats"><MiniStat label="Total de ativos" value={visibleEquipment.length} icon={Factory} /><MiniStat label="Operacionais" value={visibleEquipment.filter(item => item.status === "Operacional").length} tone="green" icon={CheckCircle2} /><MiniStat label="Em manutenção" value={visibleEquipment.filter(item => item.status === "Em manutenção").length} tone="blue" icon={Wrench} /><MiniStat label="Parados" value={visibleEquipment.filter(item => item.status === "Parado").length} tone="red" icon={AlertTriangle} /></div>
            <div className="panel"><div className="panel-toolbar"><div><h3>Cadastro de ativos</h3><p>{filteredEquipment.length} equipamentos encontrados</p></div><div className="toolbar-controls"><div className="select-wrap"><Filter size={14} /><select value={equipmentFilter} onChange={event => setEquipmentFilter(event.target.value)}><option>Todos</option><option>Operacional</option><option>Atenção</option><option>Em manutenção</option><option>Parado</option></select><ChevronDown size={13} /></div></div></div>
              {filteredEquipment.length ? <div className="table-wrap"><table><thead><tr><th>Equipamento</th><th>Setor / Categoria</th><th>Criticidade</th><th>Próxima preventiva</th><th>Status</th><th className="th-actions">Ações</th></tr></thead><tbody>{filteredEquipment.map(item => <tr key={item.id}><td><button className="equipment-cell" onClick={() => openModal("equipmentDetails", item.id)}><span className="asset-icon"><Cog size={17} /></span><span><strong>{item.name}</strong><small>{item.code} · {item.manufacturer}</small></span></button></td><td><strong className="td-main">{item.sector}</strong><small className="td-sub">{item.category}</small></td><td><span className={statusClass(item.criticality)}>{item.criticality}</span></td><td><span className="date-cell">{fmtDate(item.nextMaintenance)}</span></td><td><span className={statusClass(item.status)}><i />{item.status}</span></td><td><div className="row-actions"><button title="Visualizar" onClick={() => openModal("equipmentDetails", item.id)}><Activity size={15} /></button>{canManage && <><button title="Editar" onClick={() => openModal("equipment", item.id)}><Edit3 size={15} /></button><button title="Excluir" onClick={() => deleteRecord("equipment", item.id)}><Trash2 size={15} /></button></>}</div></td></tr>)}</tbody></table></div> : <EmptyState icon={Factory} title="Nenhum equipamento encontrado" description="Ajuste os filtros ou aguarde a atribuição de um equipamento." action={canManage ? <button className="button button-secondary" onClick={() => openModal("equipment")}><Plus size={15} /> Cadastrar equipamento</button> : undefined} />}
            </div>
          </>}

          {view === "orders" && <>
            <PageHeading eyebrow="EXECUÇÃO DA MANUTENÇÃO" title="Ordens de serviço" description="Acompanhe solicitações, responsáveis, prioridades e execução dos serviços." action={canManage ? <button className="button button-primary" onClick={() => openModal("order")}><Plus size={16} /> Nova ordem de serviço</button> : undefined} />
            <div className="mini-stats"><MiniStat label="Em aberto" value={openOrders.length} icon={ClipboardList} /><MiniStat label="Em andamento" value={visibleOrders.filter(item => item.status === "Em andamento").length} tone="blue" icon={Activity} /><MiniStat label="Aguardando peças" value={visibleOrders.filter(item => item.status === "Aguardando peças").length} tone="amber" icon={Package} /><MiniStat label="Concluídas" value={visibleOrders.filter(item => item.status === "Concluída").length} tone="green" icon={CheckCircle2} /></div>
            <div className="panel"><div className="panel-toolbar"><div><h3>Fila de manutenção</h3><p>Gerencie o ciclo de vida das ordens de serviço</p></div><div className="toolbar-controls"><div className="select-wrap"><SlidersHorizontal size={14} /><select value={orderFilter} onChange={event => setOrderFilter(event.target.value)}><option>Todas</option><option>Aberta</option><option>Em andamento</option><option>Aguardando peças</option><option>Concluída</option><option>Cancelada</option></select><ChevronDown size={13} /></div></div></div>
              {filteredOrders.length ? <div className="table-wrap"><table><thead><tr><th>Ordem / Serviço</th><th>Equipamento</th><th>Tipo</th><th>Prioridade</th><th>Responsável</th><th>Prazo</th><th>Status</th><th className="th-actions">Ações</th></tr></thead><tbody>{filteredOrders.map(item => <tr key={item.id}><td><button className="order-cell" onClick={() => openModal("orderDetails", item.id)}><strong>{item.number}</strong><small>{item.title}</small></button></td><td><strong className="td-main">{equipmentById[item.equipmentId]?.name ?? "Ativo removido"}</strong><small className="td-sub">{equipmentById[item.equipmentId]?.code ?? "—"}</small></td><td><span className={`type-label ${item.type === "Preventiva" ? "type-preventive" : "type-corrective"}`}>{item.type}</span></td><td><span className={statusClass(item.priority)}>{item.priority}</span></td><td><div className="person-cell">{technicianById[item.technicianId] ? <Avatar name={technicianById[item.technicianId].name} size="small" /> : <span className="avatar avatar-empty">?</span>}<span>{technicianById[item.technicianId]?.name ?? "Não atribuído"}</span></div></td><td><span className="date-cell">{fmtDate(item.dueDate)}</span></td><td><span className={statusClass(item.status)}><i />{item.status}</span></td><td><div className="row-actions"><button title="Detalhes" onClick={() => openModal("orderDetails", item.id)}><Activity size={15} /></button>{canManage && <><button title="Editar" onClick={() => openModal("order", item.id)}><Edit3 size={15} /></button><button title="Excluir" onClick={() => deleteRecord("order", item.id)}><Trash2 size={15} /></button></>}</div></td></tr>)}</tbody></table></div> : <EmptyState icon={ClipboardList} title="Nenhuma ordem encontrada" description={isOperator ? "Não há ordens atribuídas ao seu usuário." : "Crie uma ordem de serviço para iniciar o acompanhamento."} action={canManage ? <button className="button button-primary" onClick={() => openModal("order")}><Plus size={15} /> Nova OS</button> : undefined} />}
            </div>
          </>}

          {view === "technicians" && <>
            <PageHeading eyebrow="GESTÃO DE RECURSOS" title="Equipe técnica" description="Organize os profissionais, especialidades e disponibilidade da manutenção." action={canManage ? <button className="button button-primary" onClick={() => openModal("technician")}><Plus size={16} /> Novo técnico</button> : undefined} />
            <div className="mini-stats"><MiniStat label="Técnicos cadastrados" value={data.technicians.length} icon={Users} /><MiniStat label="Disponíveis" value={data.technicians.filter(item => item.status === "Disponível").length} tone="green" icon={CheckCircle2} /><MiniStat label="Em serviço" value={data.technicians.filter(item => item.status === "Em serviço").length} tone="blue" icon={Wrench} /><MiniStat label="Especialidades" value={new Set(data.technicians.map(item => item.specialty)).size} tone="violet" icon={Zap} /></div>
            <div className="technician-grid">{filteredTechnicians.map(tech => <div className="technician-card" key={tech.id}><div className="tech-card-top"><Avatar name={tech.name} size="large" /><button className="ghost-icon" onClick={() => openModal("technician", tech.id)}><Edit3 size={15} /></button></div><div className="tech-card-name"><h3>{tech.name}</h3><p>{tech.role}</p></div><div className="tech-specialty"><span>{tech.specialty}</span><span className={statusClass(tech.status)}><i />{tech.status}</span></div><div className="tech-card-footer"><span>{data.orders.filter(order => order.technicianId === tech.id && isOpenOrder(order.status)).length} OS ativas</span><div><button onClick={() => openModal("technician", tech.id)}><Edit3 size={14} /> Editar</button><button onClick={() => deleteRecord("technician", tech.id)} title="Excluir técnico"><Trash2 size={14} /></button></div></div></div>)}
              {!filteredTechnicians.length && <div className="panel panel-empty"><EmptyState icon={Users} title="Nenhum técnico encontrado" description="Cadastre profissionais para atribuir ordens de serviço." action={<button className="button button-primary" onClick={() => openModal("technician")}><Plus size={15} /> Novo técnico</button>} /></div>}
            </div>
          </>}

          {view === "inventory" && <>
            <PageHeading eyebrow="SUPRIMENTOS DE MANUTENÇÃO" title="Estoque de peças" description="Controle saldos, níveis mínimos e materiais aplicados nas intervenções." action={canManage ? <button className="button button-primary" onClick={() => openModal("part")}><Plus size={16} /> Nova peça</button> : undefined} />
            <div className="mini-stats"><MiniStat label="Itens cadastrados" value={data.parts.length} icon={Package} /><MiniStat label="Abaixo do mínimo" value={lowStockParts.length} tone="red" icon={AlertTriangle} /><MiniStat label="Unidades em estoque" value={data.parts.reduce((sum, item) => sum + item.stock, 0)} tone="blue" icon={Boxes} /><MiniStat label="Valor em estoque" value={money(data.parts.reduce((sum, item) => sum + item.stock * item.cost, 0))} tone="green" icon={Gauge} /></div>
            <div className="panel"><div className="panel-toolbar"><div><h3>Materiais e componentes</h3><p>{filteredParts.length} itens no cadastro</p></div><div className="toolbar-controls"><button className="button button-quiet" onClick={() => setView("orders")}><ClipboardList size={15} /> Ver consumo por OS</button></div></div>
              {filteredParts.length ? <div className="table-wrap"><table><thead><tr><th>Peça / Código</th><th>Categoria</th><th>Localização</th><th>Saldo atual</th><th>Estoque mínimo</th><th>Custo unitário</th><th>Status</th><th className="th-actions">Ações</th></tr></thead><tbody>{filteredParts.map(item => <tr key={item.id}><td><div className="part-cell"><span className="part-icon"><Package size={16} /></span><span><strong>{item.name}</strong><small>{item.code}</small></span></div></td><td className="td-main">{item.category}</td><td><span className="location-tag">{item.location}</span></td><td><strong className={item.stock <= item.minStock ? "stock-low" : "td-main"}>{item.stock} {item.unit}</strong></td><td className="td-muted">{item.minStock} {item.unit}</td><td className="td-main">{money(item.cost)}</td><td>{item.stock <= item.minStock ? <span className="status status-red"><i />Reposição</span> : <span className="status status-green"><i />Adequado</span>}</td><td><div className="row-actions"><button title="Editar" onClick={() => openModal("part", item.id)}><Edit3 size={15} /></button><button title="Excluir" onClick={() => deleteRecord("part", item.id)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState icon={Package} title="Nenhuma peça encontrada" description="Cadastre peças e componentes para controlar o consumo." action={<button className="button button-primary" onClick={() => openModal("part")}><Plus size={15} /> Nova peça</button>} />}
            </div>
          </>}

          {view === "preventive" && <>
            <PageHeading eyebrow="PLANEJAMENTO E CONFIABILIDADE" title="Plano preventivo" description="Programe rotinas recorrentes e acompanhe vencimentos da manutenção." action={canManage ? <button className="button button-primary" onClick={() => openModal("plan")}><Plus size={16} /> Novo plano</button> : undefined} />
            <div className="mini-stats"><MiniStat label="Planos ativos" value={data.plans.filter(item => item.status !== "Suspensa").length} icon={CalendarDays} /><MiniStat label="Atrasados" value={overduePlans.length} tone="red" icon={AlertTriangle} /><MiniStat label="Próximos 7 dias" value={dueSoonPlans.length} tone="amber" icon={Clock3} /><MiniStat label="Suspensos" value={data.plans.filter(item => item.status === "Suspensa").length} tone="violet" icon={SlidersHorizontal} /></div>
            <div className="planning-layout"><div className="panel planning-panel"><div className="panel-toolbar"><div><h3>Programação de preventivas</h3><p>Execute uma rotina para registrar a manutenção e calcular o próximo ciclo.</p></div><span className="soft-counter">{data.plans.length} planos</span></div>
                <div className="plan-list">{[...data.plans].sort((a, b) => a.nextDate.localeCompare(b.nextDate)).map(plan => <div className="plan-row" key={plan.id}><div className={`plan-calendar ${plan.nextDate < todayISO() ? "calendar-overdue" : ""}`}><strong>{new Date(`${plan.nextDate}T12:00:00`).getDate()}</strong><small>{new Date(`${plan.nextDate}T12:00:00`).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</small></div><div className="plan-main"><strong>{plan.title}</strong><p>{equipmentById[plan.equipmentId]?.name ?? "Equipamento removido"} <span>•</span> a cada {plan.frequencyDays} dias</p><div className="plan-meta"><span><UserRound size={13} />{technicianById[plan.technicianId]?.name ?? "Sem responsável"}</span><span><History size={13} />Última: {fmtDate(plan.lastDate)}</span></div></div><div className="plan-state"><span className={statusClass(plan.status)}><i />{plan.nextDate < todayISO() && plan.status !== "Suspensa" ? "Atrasada" : plan.status}</span><small>{plan.status === "Suspensa" ? "Sem execução" : plan.nextDate < todayISO() ? `${Math.ceil((new Date(`${todayISO()}T12:00:00`).getTime() - new Date(`${plan.nextDate}T12:00:00`).getTime()) / 86400000)} dia(s) de atraso` : `Vence em ${Math.ceil((new Date(`${plan.nextDate}T12:00:00`).getTime() - new Date(`${todayISO()}T12:00:00`).getTime()) / 86400000)} dia(s)`}</small></div><div className="row-actions"><button title="Concluir preventiva" onClick={() => completePlan(plan)} disabled={plan.status === "Suspensa"}><Check size={15} /></button><button title="Editar plano" onClick={() => openModal("plan", plan.id)}><Edit3 size={15} /></button><button title="Excluir plano" onClick={() => deleteRecord("plan", plan.id)}><Trash2 size={15} /></button></div></div>)}
                  {!data.plans.length && <EmptyState icon={CalendarClock} title="Nenhum plano cadastrado" description="Crie rotinas preventivas para organizar as próximas intervenções." />}</div>
              </div><div className="side-stack"><div className="panel compact-panel"><h3>Próximos vencimentos</h3><div className="due-list">{[...data.plans].filter(plan => plan.status !== "Suspensa").sort((a,b) => a.nextDate.localeCompare(b.nextDate)).slice(0,4).map(plan => <div className="due-row" key={plan.id}><span className="due-bullet" /><div><strong>{equipmentById[plan.equipmentId]?.code ?? "—"}</strong><small>{plan.title}</small></div><time>{fmtDate(plan.nextDate)}</time></div>)}</div></div></div></div>
          </>}

          {view === "history" && <>
            <PageHeading eyebrow="RASTREABILIDADE" title="Histórico de manutenção" description="Consulte serviços concluídos, falhas identificadas e intervenções registradas." action={<button className="button button-secondary" onClick={() => window.print()}><Download size={15} /> Imprimir relatório</button>} />
            <div className="mini-stats"><MiniStat label="Intervenções concluídas" value={visibleOrders.filter(item => item.status === "Concluída").length} icon={ClipboardCheck} /><MiniStat label="Preventivas" value={visibleOrders.filter(item => item.status === "Concluída" && item.type === "Preventiva").length} tone="green" icon={CalendarClock} /><MiniStat label="Corretivas" value={visibleOrders.filter(item => item.status === "Concluída" && item.type === "Corretiva").length} tone="amber" icon={Wrench} /><MiniStat label="Horas apontadas" value={`${visibleOrders.reduce((sum, item) => sum + item.actualHours, 0).toFixed(1)} h`} tone="blue" icon={Clock3} /></div>
            <div className="panel"><div className="panel-toolbar"><div><h3>Registro de intervenções</h3><p>Ordens finalizadas e rastreabilidade dos serviços</p></div><div className="toolbar-controls"><div className="select-wrap"><Filter size={14} /><select value={historyFilter} onChange={event => setHistoryFilter(event.target.value)}><option>Todos</option><option>Preventiva</option><option>Corretiva</option></select><ChevronDown size={13} /></div></div></div>
              {filteredHistory.length ? <div className="table-wrap"><table><thead><tr><th>Ordem</th><th>Equipamento</th><th>Tipo</th><th>Responsável</th><th>Conclusão</th><th>Tempo realizado</th><th>Intervenções</th><th /></tr></thead><tbody>{filteredHistory.map(order => <tr key={order.id}><td><button className="order-cell" onClick={() => openModal("orderDetails", order.id)}><strong>{order.number}</strong><small>{order.title}</small></button></td><td className="td-main">{equipmentById[order.equipmentId]?.name ?? "—"}</td><td><span className={`type-label ${order.type === "Preventiva" ? "type-preventive" : "type-corrective"}`}>{order.type}</span></td><td><div className="person-cell">{technicianById[order.technicianId] && <Avatar name={technicianById[order.technicianId].name} size="small" />}<span>{technicianById[order.technicianId]?.name ?? "—"}</span></div></td><td className="date-cell">{fmtDate(order.completedAt)}</td><td className="td-main">{order.actualHours.toFixed(1)} h</td><td className="td-main">{order.interventions.length}</td><td><div className="row-actions"><button title="Ver histórico" onClick={() => openModal("orderDetails", order.id)}><Activity size={15} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState icon={History} title="Nenhum serviço concluído" description="As ordens finalizadas aparecerão nesta consulta histórica." />}
            </div>
          </>}

          {view === "reports" && <Reports data={data} equipmentById={equipmentById} />}
        </div>

      </main>

      {modal && <ModalShell modal={modal} form={form} updateForm={updateForm} save={saveModal} close={() => setModal(null)} data={data} equipmentById={equipmentById} technicianById={technicianById} partById={partById} onEdit={openModal} onChangeStatus={changeOrderStatus} canManage={canManage} canOperate={isOperator} operatorTechnicianId={user.technicianId} />}
      {accountsOpen && isAdmin && <AccountManagerModal accounts={accounts} technicians={data.technicians} busy={accountBusy} onCreate={createAccount} onDelete={deleteAccount} onClose={() => setAccountsOpen(false)} />}
      {toast && <div className={`toast toast-${toast.kind}`}><span>{toast.kind === "success" ? <CheckCircle2 size={17} /> : toast.kind === "error" ? <AlertCircle size={17} /> : <CircleHelp size={17} />}</span>{toast.message}<button onClick={() => setToast(null)}><X size={15} /></button></div>}
    </div>
  );
}

function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="page-heading"><div><div className="page-eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <div className="heading-action">{action}</div>}</div>;
}

function MiniStat({ label, value, icon: Icon, tone = "default" }: { label: string; value: string | number; icon: typeof Gauge; tone?: string }) {
  return <div className="mini-stat"><div className={`mini-stat-icon mini-${tone}`}><Icon size={17} /></div><div><small>{label}</small><strong>{value}</strong></div></div>;
}

function Dashboard({ data, equipmentById, technicianById, lowStockParts, overduePlans, dueSoonPlans, onNavigate, onOpenOrder, onNewOrder }: { data: AppData; equipmentById: Record<string, Equipment>; technicianById: Record<string, Technician>; lowStockParts: Part[]; overduePlans: PreventivePlan[]; dueSoonPlans: PreventivePlan[]; onNavigate: (view: View) => void; onOpenOrder: (id: string) => void; onNewOrder: () => void }) {
  const activeOrders = data.orders.filter(item => isOpenOrder(item.status));
  const completedOrders = data.orders.filter(item => item.status === "Concluída");
  const reliability = data.orders.length ? Math.round((completedOrders.length / data.orders.length) * 100) : 0;
  const statusCounts = [
    { label: "Operacional", count: data.equipment.filter(item => item.status === "Operacional").length, color: "#20a88a" },
    { label: "Atenção", count: data.equipment.filter(item => item.status === "Atenção").length, color: "#e9a23b" },
    { label: "Em manutenção", count: data.equipment.filter(item => item.status === "Em manutenção").length, color: "#5287de" },
    { label: "Parado", count: data.equipment.filter(item => item.status === "Parado").length, color: "#dc6a6a" }
  ];
  const totalStatus = Math.max(1, statusCounts.reduce((sum, item) => sum + item.count, 0));
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setMonth(date.getMonth() - 3 + index);
    const month = date.getMonth(); const year = date.getFullYear();
    const count = data.orders.filter(order => { const value = new Date(`${order.openedAt}T12:00:00`); return value.getMonth() === month && value.getFullYear() === year; }).length;
    return { label: date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""), count };
  });
  const maxMonth = Math.max(1, ...months.map(item => item.count));
  const upcomingOrders = [...activeOrders].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5);
  return <>
    <div className="dashboard-welcome"><div><div className="page-eyebrow">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).toUpperCase()}</div><h1>Bom dia, <em>equipe.</em></h1><p>Acompanhe os principais indicadores e prioridades da manutenção.</p></div><button className="button button-primary" onClick={onNewOrder}><Plus size={16} /> Abrir ordem de serviço</button></div>
    <div className="kpi-grid">
      <div className="kpi-card"><div className="kpi-top"><span>Ativos cadastrados</span><span className="kpi-icon kpi-icon-blue"><Factory size={17} /></span></div><strong>{data.equipment.length}</strong><div className="kpi-bottom"><span className="kpi-caption">Base de equipamentos</span><button onClick={() => onNavigate("equipment")}>Ver ativos <ArrowUpRight size={13} /></button></div></div>
      <div className="kpi-card"><div className="kpi-top"><span>Ordens em aberto</span><span className="kpi-icon kpi-icon-amber"><ClipboardList size={17} /></span></div><strong>{activeOrders.length}</strong><div className="kpi-bottom"><span className="kpi-caption"><b className="text-amber">{activeOrders.filter(item => item.priority === "Crítica" || item.priority === "Alta").length}</b> alta prioridade</span><button onClick={() => onNavigate("orders")}>Ver ordens <ArrowUpRight size={13} /></button></div></div>
      <div className="kpi-card"><div className="kpi-top"><span>Preventivas atrasadas</span><span className="kpi-icon kpi-icon-red"><CalendarClock size={17} /></span></div><strong>{overduePlans.length}</strong><div className="kpi-bottom"><span className="kpi-caption">{dueSoonPlans.length} vencem em até 7 dias</span><button onClick={() => onNavigate("preventive")}>Planejar <ArrowUpRight size={13} /></button></div></div>
      <div className="kpi-card"><div className="kpi-top"><span>Ordens concluídas</span><span className="kpi-icon kpi-icon-green"><CheckCircle2 size={17} /></span></div><strong>{completedOrders.length}</strong><div className="kpi-bottom"><span className="kpi-caption">{reliability}% do total de OS</span><button onClick={() => onNavigate("history")}>Histórico <ArrowUpRight size={13} /></button></div></div>
    </div>
    <div className="dashboard-grid dashboard-grid-top">
      <div className="panel chart-panel"><div className="panel-toolbar"><div><h3>Ordens de serviço</h3><p>Volume de solicitações no período de acompanhamento</p></div><span className="chart-legend"><i /> Ordens registradas</span></div><div className="bar-chart">{months.map((month, index) => <div className="bar-column" key={`${month.label}-${index}`}><div className="bar-value">{month.count || ""}</div><div className="bar-track"><div className="bar-fill" style={{ height: `${Math.max(5, (month.count / maxMonth) * 100)}%` }} /></div><span>{month.label}</span></div>)}</div><div className="chart-footer"><span><b>{data.orders.length}</b> ordens registradas no sistema</span><button onClick={() => onNavigate("reports")}>Ver indicadores <ArrowRight size={13} /></button></div></div>
      <div className="panel asset-health-panel"><div className="panel-toolbar"><div><h3>Condição dos ativos</h3><p>Distribuição por situação atual</p></div><button className="more-button" onClick={() => onNavigate("equipment")}><MoreHorizontal size={18} /></button></div><div className="donut-area"><div className="donut" style={{ background: `conic-gradient(${statusCounts.map((item, index) => { const start = statusCounts.slice(0, index).reduce((sum, prev) => sum + prev.count, 0) / totalStatus * 100; const end = (start + item.count / totalStatus * 100); return `${item.color} ${start}% ${end}%`; }).join(",")})` }}><div><strong>{data.equipment.length}</strong><small>ativos</small></div></div><div className="donut-legend">{statusCounts.map(item => <div key={item.label}><span><i style={{ background: item.color }} />{item.label}</span><strong>{item.count}</strong></div>)}</div></div><div className="health-foot"><span>{data.equipment.filter(item => item.status === "Operacional").length} de {data.equipment.length} ativos operacionais</span><b>{data.equipment.length ? Math.round(data.equipment.filter(item => item.status === "Operacional").length / data.equipment.length * 100) : 0}%</b></div></div>
    </div>
    <div className="dashboard-grid dashboard-grid-bottom">
      <div className="panel orders-panel"><div className="panel-toolbar"><div><h3>Ordens prioritárias</h3><p>Serviços que exigem acompanhamento</p></div><button className="text-link" onClick={() => onNavigate("orders")}>Ver todas <ArrowRight size={14} /></button></div>{upcomingOrders.length ? <div className="priority-order-list">{upcomingOrders.map(order => <button className="priority-order-row" key={order.id} onClick={() => onOpenOrder(order.id)}><span className={`priority-indicator priority-${order.priority.toLowerCase()}`} /><span className="priority-order-main"><strong>{order.title}</strong><small>{order.number} <i>•</i> {equipmentById[order.equipmentId]?.name ?? "—"}</small></span><span className="priority-order-side"><b>{order.priority}</b><small>Prazo {fmtDate(order.dueDate)}</small></span><ChevronRight size={16} /></button>)}</div> : <div className="inline-empty">Nenhuma ordem em aberto.</div>}</div>
      <div className="panel attention-panel"><div className="panel-toolbar"><div><h3>Pontos de atenção</h3><p>Alertas que merecem ação</p></div><span className="attention-count">{overduePlans.length + lowStockParts.length}</span></div><div className="attention-list">{overduePlans.slice(0, 3).map(plan => <button className="attention-row" key={plan.id} onClick={() => onNavigate("preventive")}><span className="attention-icon attention-icon-red"><AlertTriangle size={16} /></span><span><strong>Preventiva atrasada</strong><small>{equipmentById[plan.equipmentId]?.name} · {fmtDate(plan.nextDate)}</small></span><ChevronRight size={15} /></button>)}{lowStockParts.slice(0, 3).map(part => <button className="attention-row" key={part.id} onClick={() => onNavigate("inventory")}><span className="attention-icon attention-icon-amber"><Package size={16} /></span><span><strong>Estoque abaixo do mínimo</strong><small>{part.name} · {part.stock} {part.unit} disponíveis</small></span><ChevronRight size={15} /></button>)}{!overduePlans.length && !lowStockParts.length && <div className="attention-clear"><CheckCircle2 size={20} /><span>Nenhum alerta crítico.</span></div>}</div></div>
    </div>
  </>;
}

function Reports({ data, equipmentById }: { data: AppData; equipmentById: Record<string, Equipment> }) {
  const completed = data.orders.filter(item => item.status === "Concluída");
  const preventive = completed.filter(item => item.type === "Preventiva").length;
  const corrective = completed.filter(item => item.type === "Corretiva").length;
  const hours = data.orders.reduce((sum, item) => sum + item.actualHours, 0);
  const totalParts = data.orders.reduce((sum, order) => sum + order.partsUsed.reduce((partSum, used) => partSum + used.quantity, 0), 0);
  const costParts = data.orders.reduce((sum, order) => sum + order.partsUsed.reduce((partSum, used) => partSum + used.quantity * (data.parts.find(part => part.id === used.partId)?.cost ?? 0), 0), 0);
  const maxStatus = Math.max(1, ...["Aberta", "Em andamento", "Aguardando peças", "Concluída", "Cancelada"].map(status => data.orders.filter(item => item.status === status).length));
  const statusColors: Record<string, string> = { "Aberta": "#6b93da", "Em andamento": "#36a6bb", "Aguardando peças": "#e7a34a", "Concluída": "#25a58b", "Cancelada": "#c8cdd5" };
  const priorityCounts = ["Crítica", "Alta", "Média", "Baixa"].map(priority => ({ priority, count: data.orders.filter(item => item.priority === priority && isOpenOrder(item.status)).length }));
  return <>
    <PageHeading eyebrow="INTELIGÊNCIA OPERACIONAL" title="Indicadores" description="Visão consolidada de execução, utilização de recursos e saúde dos ativos." action={<button className="button button-secondary" onClick={() => window.print()}><Download size={15} /> Exportar / imprimir</button>} />
    <div className="report-kpi-grid"><div className="report-kpi"><span>Ordens concluídas</span><strong>{completed.length}</strong><small>De {data.orders.length} ordens registradas</small></div><div className="report-kpi"><span>Horas apontadas</span><strong>{hours.toFixed(1)} h</strong><small>Tempo de execução informado</small></div><div className="report-kpi"><span>Peças consumidas</span><strong>{totalParts}</strong><small>Unidades vinculadas às OS</small></div><div className="report-kpi"><span>Custo de peças</span><strong>{money(costParts)}</strong><small>Valor calculado pelo custo unitário</small></div></div>
    <div className="reports-grid"><div className="panel report-panel"><div className="panel-toolbar"><div><h3>Ordens por situação</h3><p>Distribuição de todas as ordens cadastradas</p></div></div><div className="report-status-list">{["Aberta", "Em andamento", "Aguardando peças", "Concluída", "Cancelada"].map(status => { const count = data.orders.filter(item => item.status === status).length; return <div className="report-status-row" key={status}><div><span>{status}</span><strong>{count}</strong></div><div className="report-progress"><i style={{ width: `${count / maxStatus * 100}%`, background: statusColors[status] }} /></div></div>; })}</div></div>
      <div className="panel report-panel"><div className="panel-toolbar"><div><h3>Perfil de manutenção</h3><p>Preventiva x corretiva concluída</p></div></div><div className="maintenance-comparison"><div className="comparison-circle" style={{ background: `conic-gradient(#24a88e 0 ${completed.length ? preventive / completed.length * 100 : 0}%, #e8eef1 0 100%)` }}><strong>{completed.length ? Math.round(preventive / completed.length * 100) : 0}%</strong><small>preventiva</small></div><div className="comparison-detail"><div><span><i className="dot-preventive" />Preventiva</span><strong>{preventive}</strong></div><div><span><i className="dot-corrective" />Corretiva</span><strong>{corrective}</strong></div><p>Uma rotina preventiva estruturada contribui para reduzir intervenções corretivas não planejadas.</p></div></div></div>
      <div className="panel report-panel report-wide"><div className="panel-toolbar"><div><h3>Ordens abertas por prioridade</h3><p>Distribuição da carga de trabalho pendente</p></div></div><div className="priority-breakdown">{priorityCounts.map(item => <div className="priority-breakdown-item" key={item.priority}><div className={`priority-square square-${item.priority.toLowerCase()}`} /><div><strong>{item.priority}</strong><small>{item.count} ordens</small></div><b>{data.orders.length ? Math.round(item.count / Math.max(1, data.orders.filter(order => isOpenOrder(order.status)).length) * 100) : 0}%</b></div>)}</div></div>
      <div className="panel report-panel report-wide"><div className="panel-toolbar"><div><h3>Ativos com maior volume de OS</h3><p>Equipamentos com mais ordens de serviço registradas</p></div></div><div className="asset-ranking">{data.equipment.map(item => ({ ...item, count: data.orders.filter(order => order.equipmentId === item.id).length })).sort((a,b) => b.count - a.count).slice(0,5).map((item,index) => <div className="ranking-row" key={item.id}><span className="ranking-number">0{index + 1}</span><div><strong>{item.name}</strong><small>{item.code} · {item.sector}</small></div><div className="ranking-bar"><i style={{ width: `${item.count / Math.max(1, data.orders.length) * 100}%` }} /></div><b>{item.count} OS</b></div>)}</div></div>
    </div>
    <div className="report-note"><CircleHelp size={16} /><span>Indicadores calculados com base nos registros disponíveis. A qualidade dos resultados depende da atualização correta das ordens, horas e materiais consumidos.</span></div>
  </>;
}

function AccountManagerModal({ accounts, technicians, busy, onCreate, onDelete, onClose }: { accounts: AppAccount[]; technicians: Technician[]; busy: boolean; onCreate: (account: Omit<AppAccount, "id">) => void; onDelete: (account: AppAccount) => void; onClose: () => void }) {
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("Planejador");
  const [technicianId, setTechnicianId] = useState("");
  const [message, setMessage] = useState("");
  const allAccounts: AppAccount[] = [{ id: "fixed-admin", username: ADMIN_USERNAME, name: "Administrador", role: "ADM" }, ...accounts.filter(account => account.username.toLowerCase() !== ADMIN_USERNAME.toLowerCase())];
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username.trim()) || !name.trim() || password.length < 4) {
      setMessage("Preencha usuário, nome e uma senha com pelo menos quatro caracteres.");
      return;
    }
    if (username.trim().toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
      setMessage("O usuário administrativo é fixo e não pode ser recriado.");
      return;
    }
    if (role === "Operador" && !technicianId) {
      setMessage("Vincule o operador a um técnico cadastrado.");
      return;
    }
    onCreate({ username: username.trim(), name: name.trim(), password, role, technicianId: role === "Operador" ? technicianId : undefined });
    setUsername("");
    setName("");
    setPassword("");
    setRole("Planejador");
    setTechnicianId("");
    setMessage("");
  };
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}><div className="modal-card account-modal" role="dialog" aria-modal="true"><div className="modal-header"><div><div className="modal-kicker">ADMINISTRAÇÃO</div><h2>Contas de acesso</h2></div><button className="modal-close" onClick={onClose}><X size={18} /></button></div><div className="account-modal-content"><form className="account-create-form" onSubmit={submit}><div className="account-form-heading"><strong>Criar novo acesso</strong><span>O tipo de conta determina as permissões disponíveis.</span></div><div className="form-grid"><Field label="Nome de usuário"><input value={username} onChange={event => setUsername(event.target.value)} placeholder="Ex.: joao.silva" required /></Field><Field label="Nome completo"><input value={name} onChange={event => setName(event.target.value)} placeholder="Nome do usuário" required /></Field><Field label="Senha"><input type="password" minLength={4} value={password} onChange={event => setPassword(event.target.value)} placeholder="Defina uma senha" required /></Field><Field label="Nível de acesso"><div className="input-select"><select value={role} onChange={event => setRole(event.target.value as AppRole)}><option value="Planejador">Planejador</option><option value="Operador">Operador</option></select><ChevronDown size={14} /></div></Field>{role === "Operador" && <Field label="Técnico vinculado" wide><div className="input-select"><select value={technicianId} onChange={event => setTechnicianId(event.target.value)}><option value="">Selecione o técnico</option>{technicians.map(technician => <option key={technician.id} value={technician.id}>{technician.name} · {technician.specialty}</option>)}</select><ChevronDown size={14} /></div></Field>}</div>{message && <div className="auth-message"><AlertCircle size={15} />{message}</div>}<div className="modal-actions"><button className="button button-primary" type="submit" disabled={busy}><Plus size={15} /> Criar conta</button></div></form><div className="account-list-heading"><strong>Usuários cadastrados</strong><span>{allAccounts.length} contas</span></div><div className="account-list">{allAccounts.map(account => <div className="account-row" key={account.id}><Avatar name={account.name} size="small" /><div className="account-row-main"><strong>{account.name}</strong><small>{account.username}</small></div><span className={`account-role role-${account.role.toLowerCase()}`}>{account.role}</span>{account.role !== "ADM" && <button className="account-remove" onClick={() => onDelete(account)} disabled={busy} title="Remover conta"><Trash2 size={15} /></button>}</div>)}</div></div></div></div>;
}

function ModalShell({ modal, form, updateForm, save, close, data, equipmentById, technicianById, partById, onEdit, onChangeStatus, canManage, canOperate, operatorTechnicianId }: { modal: ModalState; form: FormValues; updateForm: (key: string, value: string) => void; save: (event: FormEvent<HTMLFormElement>) => void; close: () => void; data: AppData; equipmentById: Record<string, Equipment>; technicianById: Record<string, Technician>; partById: Record<string, Part>; onEdit: (type: ModalType, id?: string, parentId?: string) => void; onChangeStatus: (order: WorkOrder, status: OrderStatus) => void; canManage: boolean; canOperate: boolean; operatorTechnicianId?: string }) {
  const set = (key: string) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => updateForm(key, event.target.value);
  const input = (key: string, placeholder = "") => <input value={form[key] ?? ""} onChange={set(key)} placeholder={placeholder} />;
  const select = (key: string, options: string[]) => <div className="input-select"><select value={form[key] ?? ""} onChange={set(key)}>{options.map(option => <option key={option}>{option}</option>)}</select><ChevronDown size={14} /></div>;
  const date = (key: string) => <input type="date" value={form[key] ?? ""} onChange={set(key)} />;
  const number = (key: string, min = "0", step = "1") => <input type="number" min={min} step={step} value={form[key] ?? ""} onChange={set(key)} />;
  const area = (key: string, placeholder = "") => <textarea rows={3} value={form[key] ?? ""} onChange={set(key)} placeholder={placeholder} />;
  const titleMap: Record<ModalType, string> = { equipment: modal.id ? "Editar equipamento" : "Novo equipamento", technician: modal.id ? "Editar técnico" : "Novo técnico", order: modal.id ? "Editar ordem de serviço" : "Nova ordem de serviço", part: modal.id ? "Editar peça" : "Cadastrar peça", plan: modal.id ? "Editar plano preventivo" : "Novo plano preventivo", intervention: "Registrar intervenção", consumePart: "Registrar consumo de peça", orderDetails: "Detalhes da ordem", equipmentDetails: "Ficha do equipamento" };
  const order = modal.type === "orderDetails" ? data.orders.find(item => item.id === modal.id) : undefined;
  const equipment = modal.type === "equipmentDetails" ? data.equipment.find(item => item.id === modal.id) : undefined;
  const equipmentOrders = equipment ? data.orders.filter(item => item.equipmentId === equipment.id && (!canOperate || item.technicianId === operatorTechnicianId)).sort((a,b) => b.openedAt.localeCompare(a.openedAt)) : [];
  const [orderTab, setOrderTab] = useState<"overview" | "timeline">("overview");
  return <div className="modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}><div className={`modal-card ${modal.type === "orderDetails" || modal.type === "equipmentDetails" ? "modal-detail" : ""}`} role="dialog" aria-modal="true"><div className="modal-header"><div><div className="modal-kicker">INDUSTRIALTECH · GESTÃO DE MANUTENÇÃO</div><h2>{titleMap[modal.type]}</h2></div><button className="modal-close" onClick={close}><X size={18} /></button></div>
      {modal.type === "orderDetails" && order && <div className="detail-content"><div className="detail-order-heading"><div><span className="detail-order-number">{order.number}</span><h3>{order.title}</h3><p>{equipmentById[order.equipmentId]?.name ?? "Equipamento removido"} <i>•</i> Aberta em {fmtDate(order.openedAt)}</p></div><span className={statusClass(order.status)}><i />{order.status}</span></div><div className="detail-tabs"><button className={orderTab === "overview" ? "tab-active" : ""} onClick={() => setOrderTab("overview")}>Resumo</button><button className={orderTab === "timeline" ? "tab-active" : ""} onClick={() => setOrderTab("timeline")}>Intervenções ({order.interventions.length})</button></div>
          {orderTab === "overview" ? <><div className="detail-grid"><div><small>Tipo</small><strong>{order.type}</strong></div><div><small>Prioridade</small><strong>{order.priority}</strong></div><div><small>Prazo</small><strong>{fmtDate(order.dueDate)}</strong></div><div><small>Responsável</small><strong>{technicianById[order.technicianId]?.name ?? "Não atribuído"}</strong></div></div><div className="detail-description"><span>Descrição do serviço</span><p>{order.description || "Sem descrição registrada."}</p></div>{order.failureCause && <div className="failure-box"><AlertTriangle size={16} /><div><strong>Causa da falha identificada</strong><p>{order.failureCause}</p></div></div>}<div className="detail-section-title"><strong>Peças utilizadas</strong>{canManage && <button onClick={() => onEdit("consumePart", undefined, order.id)}><Plus size={14} /> Adicionar peça</button>}</div>{order.partsUsed.length ? <div className="used-parts">{order.partsUsed.map((used,index) => <div key={`${used.partId}-${index}`}><Package size={15} /><span>{partById[used.partId]?.name ?? "Peça removida"}</span><b>{used.quantity} {partById[used.partId]?.unit ?? "un"}</b></div>)}</div> : <p className="empty-inline-text">Nenhuma peça vinculada a esta ordem.</p>}</> : <div className="timeline-list">{order.interventions.length ? order.interventions.map(item => <div className="timeline-item" key={item.id}><div className="timeline-marker"><Wrench size={13} /></div><div className="timeline-body"><div><strong>{technicianById[item.technicianId]?.name ?? "Equipe técnica"}</strong><time>{fmtDate(item.date)} · {item.hours} h</time></div><p>{item.description}</p></div></div>) : <div className="empty-inline-text">Ainda não há intervenções registradas.</div>}</div>}
          <div className="detail-footer"><div className="detail-footer-actions">{(canManage || canOperate) && <button className="button button-secondary button-small" onClick={() => onEdit("intervention", undefined, order.id)}><Plus size={14} /> Intervenção</button>}{canManage && <button className="button button-secondary button-small" onClick={() => onEdit("order", order.id)}><Edit3 size={14} /> Editar OS</button>}</div><div className="status-actions">{isOpenOrder(order.status) && canOperate && order.status === "Aberta" && <button className="button button-quiet button-small" onClick={() => onChangeStatus(order, "Em andamento")}>Iniciar execução</button>}{isOpenOrder(order.status) && canOperate && <button className="button button-quiet button-small" onClick={() => onChangeStatus(order, "Aguardando peças")}>Aguardar peças</button>}{isOpenOrder(order.status) && (canManage || canOperate) && <button className="button button-primary button-small" onClick={() => onChangeStatus(order, "Concluída")}><Check size={14} /> Concluir OS</button>}</div></div>
        </div>}
      {modal.type === "equipmentDetails" && equipment && <div className="detail-content"><div className="asset-detail-hero"><span className="asset-icon asset-icon-large"><Cog size={24} /></span><div><span className="detail-order-number">{equipment.code}</span><h3>{equipment.name}</h3><p>{equipment.manufacturer} · {equipment.model}</p></div><span className={statusClass(equipment.status)}><i />{equipment.status}</span></div><div className="detail-grid"><div><small>Setor</small><strong>{equipment.sector}</strong></div><div><small>Categoria</small><strong>{equipment.category}</strong></div><div><small>Criticidade</small><strong>{equipment.criticality}</strong></div><div><small>Próxima preventiva</small><strong>{fmtDate(equipment.nextMaintenance)}</strong></div><div><small>Nº de série</small><strong>{equipment.serial}</strong></div><div><small>Instalação</small><strong>{fmtDate(equipment.installedAt)}</strong></div></div>{equipment.notes && <div className="detail-description"><span>Observações</span><p>{equipment.notes}</p></div>}<div className="detail-section-title"><strong>Histórico de manutenção</strong><span>{equipmentOrders.length} OS registradas</span></div>{equipmentOrders.length ? <div className="asset-history-list">{equipmentOrders.slice(0,6).map(item => <button key={item.id} onClick={() => onEdit("orderDetails", item.id)}><span className="history-dot" /><span><strong>{item.title}</strong><small>{item.number} · {fmtDate(item.openedAt)}</small></span><span className={statusClass(item.status)}>{item.status}</span><ChevronRight size={15} /></button>)}</div> : <p className="empty-inline-text">Nenhuma ordem vinculada a este equipamento.</p>}{canManage && <div className="detail-footer"><span className="muted-note">Ficha cadastral do ativo</span><button className="button button-primary button-small" onClick={() => onEdit("equipment", equipment.id)}><Edit3 size={14} /> Editar equipamento</button></div>}</div>}
      {!["orderDetails", "equipmentDetails"].includes(modal.type) && <form className="modal-form" onSubmit={save}>
        {modal.type === "equipment" && <div className="form-grid"><Field label="Código do ativo">{input("code", "EQP-008")}</Field><Field label="Nome do equipamento">{input("name", "Ex.: Bomba centrífuga")}</Field><Field label="Categoria">{input("category", "Ex.: Bombas")}</Field><Field label="Setor">{input("sector", "Ex.: Utilidades")}</Field><Field label="Fabricante">{input("manufacturer", "Fabricante")}</Field><Field label="Modelo">{input("model", "Modelo")}</Field><Field label="Número de série">{input("serial", "Nº de série")}</Field><Field label="Criticidade">{select("criticality", ["Baixa", "Média", "Alta", "Crítica"])}</Field><Field label="Status">{select("status", ["Operacional", "Atenção", "Em manutenção", "Parado"])}</Field><Field label="Data de instalação">{date("installedAt")}</Field><Field label="Próxima preventiva">{date("nextMaintenance")}</Field><Field label="Observações" wide>{area("notes", "Informações relevantes sobre o ativo...")}</Field></div>}
        {modal.type === "technician" && <div className="form-grid"><Field label="Nome completo" wide>{input("name", "Nome do profissional")}</Field><Field label="Cargo / função">{input("role", "Técnico de Manutenção")}</Field><Field label="Especialidade">{select("specialty", ["Mecânica", "Elétrica", "Hidráulica", "Automação", "Instrumentação", "Caldeiraria", "Geral"])}</Field><Field label="Disponibilidade">{select("status", ["Disponível", "Em serviço", "Afastado"])}</Field></div>}
        {modal.type === "order" && <div className="form-grid"><Field label="Título do serviço" wide>{input("title", "Ex.: Inspeção de conjunto mecânico")}</Field><Field label="Equipamento"> <div className="input-select"><select value={form.equipmentId ?? ""} onChange={set("equipmentId")}>{data.equipment.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select><ChevronDown size={14} /></div></Field><Field label="Responsável"><div className="input-select"><select value={form.technicianId ?? ""} onChange={set("technicianId")}><option value="">Não atribuído</option>{data.technicians.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={14} /></div></Field><Field label="Tipo de manutenção">{select("type", ["Preventiva", "Corretiva"])}</Field><Field label="Prioridade">{select("priority", ["Baixa", "Média", "Alta", "Crítica"])}</Field><Field label="Status">{select("status", ["Aberta", "Em andamento", "Aguardando peças", "Concluída", "Cancelada"])}</Field><Field label="Data de abertura">{date("openedAt")}</Field><Field label="Prazo previsto">{date("dueDate")}</Field><Field label="Horas estimadas">{number("estimatedHours", "0", "0.5")}</Field>{modal.id && <Field label="Horas realizadas">{number("actualHours", "0", "0.5")}</Field>}<Field label="Descrição do serviço" wide>{area("description", "Descreva o problema identificado ou a atividade planejada...")}</Field><Field label="Causa da falha (se aplicável)" wide>{input("failureCause", "Ex.: desgaste, falha elétrica, vazamento...")}</Field></div>}
        {modal.type === "part" && <div className="form-grid"><Field label="Código da peça">{input("code", "COD-000")}</Field><Field label="Nome / descrição">{input("name", "Nome do componente")}</Field><Field label="Categoria">{input("category", "Ex.: Elétrica")}</Field><Field label="Localização">{input("location", "Ex.: A-01-02")}</Field><Field label="Saldo atual">{number("stock", "0")}</Field><Field label="Estoque mínimo">{number("minStock", "0")}</Field><Field label="Unidade">{select("unit", ["un", "kg", "L", "m", "kit", "cx", "par"])}</Field><Field label="Custo unitário (R$)">{number("cost", "0", "0.01")}</Field></div>}
        {modal.type === "plan" && <div className="form-grid"><Field label="Nome da rotina" wide>{input("title", "Ex.: Inspeção mensal do compressor")}</Field><Field label="Equipamento"><div className="input-select"><select value={form.equipmentId ?? ""} onChange={set("equipmentId")}>{data.equipment.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select><ChevronDown size={14} /></div></Field><Field label="Responsável"><div className="input-select"><select value={form.technicianId ?? ""} onChange={set("technicianId")}><option value="">Não atribuído</option>{data.technicians.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={14} /></div></Field><Field label="Periodicidade (dias)">{number("frequencyDays", "1")}</Field><Field label="Status">{select("status", ["Programada", "Atrasada", "Suspensa"])}</Field><Field label="Última execução">{date("lastDate")}</Field><Field label="Próxima execução">{date("nextDate")}</Field></div>}
        {modal.type === "intervention" && <div className="form-grid"><Field label="Data da intervenção">{date("date")}</Field><Field label="Horas apontadas">{number("hours", "0.1", "0.1")}</Field><Field label="Descrição da atividade" wide>{area("description", "Descreva o diagnóstico, atividade executada e resultado...")}</Field><div className="form-hint form-hint-wide"><Clock3 size={15} /> As horas serão somadas ao total realizado da ordem de serviço.</div></div>}
        {modal.type === "consumePart" && <div className="form-grid"><Field label="Peça / componente" wide><div className="input-select"><select value={form.partId ?? ""} onChange={set("partId")}>{data.parts.map(item => <option key={item.id} value={item.id}>{item.code} · {item.name} (saldo: {item.stock} {item.unit})</option>)}</select><ChevronDown size={14} /></div></Field><Field label="Quantidade utilizada">{number("quantity", "1")}</Field><div className="form-hint form-hint-wide"><PackageCheck size={15} /> O saldo do estoque será atualizado automaticamente e o consumo ficará vinculado à OS.</div></div>}
        <div className="modal-actions"><button type="button" className="button button-quiet" onClick={close}>Cancelar</button><button type="submit" className="button button-primary"><Check size={15} /> Salvar registro</button></div>
      </form>}
    </div></div>;
}
