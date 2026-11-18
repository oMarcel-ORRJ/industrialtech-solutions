export type EquipmentStatus = "Operacional" | "Atenção" | "Em manutenção" | "Parado";
export type OrderStatus = "Aberta" | "Em andamento" | "Aguardando peças" | "Concluída" | "Cancelada";
export type Priority = "Baixa" | "Média" | "Alta" | "Crítica";
export type MaintenanceType = "Preventiva" | "Corretiva";
export type AppRole = "ADM" | "Planejador" | "Operador";

export type AppAccount = {
  id: string;
  username: string;
  name: string;
  password?: string;
  role: AppRole;
  technicianId?: string;
};

export type ActiveUser = {
  id: string;
  username: string;
  name: string;
  role: AppRole;
  technicianId?: string;
};

export type Equipment = {
  id: string;
  code: string;
  name: string;
  category: string;
  sector: string;
  manufacturer: string;
  model: string;
  serial: string;
  criticality: Priority;
  status: EquipmentStatus;
  installedAt: string;
  nextMaintenance: string;
  notes: string;
};

export type Technician = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  status: "Disponível" | "Em serviço" | "Afastado";
};

export type Part = {
  id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  cost: number;
  location: string;
};

export type UsedPart = { partId: string; quantity: number };
export type Intervention = {
  id: string;
  date: string;
  technicianId: string;
  description: string;
  hours: number;
};

export type WorkOrder = {
  id: string;
  number: string;
  equipmentId: string;
  title: string;
  description: string;
  type: MaintenanceType;
  priority: Priority;
  status: OrderStatus;
  technicianId: string;
  openedAt: string;
  dueDate: string;
  completedAt: string;
  estimatedHours: number;
  actualHours: number;
  failureCause: string;
  partsUsed: UsedPart[];
  interventions: Intervention[];
};

export type PreventivePlan = {
  id: string;
  equipmentId: string;
  title: string;
  frequencyDays: number;
  lastDate: string;
  nextDate: string;
  technicianId: string;
  status: "Programada" | "Atrasada" | "Suspensa";
};

export type AppData = {
  equipment: Equipment[];
  technicians: Technician[];
  parts: Part[];
  orders: WorkOrder[];
  plans: PreventivePlan[];
};

export const emptyData: AppData = {
  equipment: [],
  technicians: [],
  parts: [],
  orders: [],
  plans: []
};
