import type { AppData } from "./types";

const demoTemplate: AppData = {
  equipment: [
    { id: "eq-001", code: "EQP-001", name: "Centro de Usinagem CNC", category: "Usinagem", sector: "Produção A", manufacturer: "DMG MORI", model: "CMX 600 V", serial: "DMG-19A-044", criticality: "Crítica", status: "Operacional", installedAt: "2021-03-18", nextMaintenance: "2026-11-21", notes: "Verificar lubrificação do eixo X." },
    { id: "eq-002", code: "EQP-002", name: "Compressor de Ar", category: "Utilidades", sector: "Casa de Máquinas", manufacturer: "Atlas Copco", model: "GA 30", serial: "AC-30221", criticality: "Alta", status: "Atenção", installedAt: "2020-08-10", nextMaintenance: "2026-11-19", notes: "Vibração acima do padrão na última inspeção." },
    { id: "eq-003", code: "EQP-003", name: "Prensa Hidráulica", category: "Conformação", sector: "Produção B", manufacturer: "Schuler", model: "HP 250", serial: "SCH-250-881", criticality: "Crítica", status: "Em manutenção", installedAt: "2019-11-02", nextMaintenance: "2026-12-03", notes: "Aguardando conclusão da OS corretiva." },
    { id: "eq-004", code: "EQP-004", name: "Esteira Transportadora 01", category: "Movimentação", sector: "Expedição", manufacturer: "SEW-Eurodrive", model: "CT-180", serial: "SEW-180-337", criticality: "Média", status: "Operacional", installedAt: "2022-05-14", nextMaintenance: "2026-12-10", notes: "Inspecionar tensionamento das correias." },
    { id: "eq-005", code: "EQP-005", name: "Torno CNC", category: "Usinagem", sector: "Produção A", manufacturer: "Mazak", model: "QT-200", serial: "MZK-200-771", criticality: "Alta", status: "Parado", installedAt: "2018-02-27", nextMaintenance: "2026-11-17", notes: "Falha no sensor de posição da torre." },
    { id: "eq-006", code: "EQP-006", name: "Bomba de Refrigeração", category: "Bombas", sector: "Utilidades", manufacturer: "KSB", model: "Etanorm 50", serial: "KSB-50-029", criticality: "Média", status: "Operacional", installedAt: "2023-01-09", nextMaintenance: "2027-01-09", notes: "Equipamento reserva do circuito." },
    { id: "eq-007", code: "EQP-007", name: "Robô de Soldagem", category: "Robótica", sector: "Célula 03", manufacturer: "ABB", model: "IRB 1600", serial: "ABB-16-903", criticality: "Alta", status: "Operacional", installedAt: "2022-09-21", nextMaintenance: "2026-11-28", notes: "Revisar cabos do dress pack." }
  ],
  technicians: [
    { id: "tec-001", name: "Rafael Mendes", role: "Técnico de Manutenção II", specialty: "Mecânica", status: "Em serviço" },
    { id: "tec-002", name: "Camila Oliveira", role: "Técnica de Manutenção III", specialty: "Elétrica", status: "Disponível" },
    { id: "tec-003", name: "Bruno Carvalho", role: "Eletromecânico", specialty: "Hidráulica", status: "Em serviço" },
    { id: "tec-004", name: "Juliana Ferreira", role: "Técnica de Automação", specialty: "Automação", status: "Disponível" },
    { id: "tec-005", name: "Diego Santos", role: "Mecânico de Manutenção I", specialty: "Mecânica", status: "Afastado" }
  ],
  parts: [
    { id: "part-001", code: "ROL-6205", name: "Rolamento rígido 6205", category: "Rolamentos", stock: 18, minStock: 8, unit: "un", cost: 32.9, location: "A-01-03" },
    { id: "part-002", code: "COR-A42", name: "Correia perfil A42", category: "Transmissão", stock: 4, minStock: 6, unit: "un", cost: 48.5, location: "B-02-01" },
    { id: "part-003", code: "SEN-IND-12", name: "Sensor indutivo M12", category: "Sensores", stock: 11, minStock: 4, unit: "un", cost: 86, location: "C-01-02" },
    { id: "part-004", code: "FIL-AR-30", name: "Elemento filtrante de ar", category: "Filtros", stock: 3, minStock: 5, unit: "un", cost: 119.9, location: "B-03-04" },
    { id: "part-005", code: "OLE-HLP46", name: "Óleo hidráulico ISO VG 46", category: "Lubrificantes", stock: 75, minStock: 20, unit: "L", cost: 18.7, location: "D-01-01" },
    { id: "part-006", code: "FUS-10A", name: "Fusível retardado 10A", category: "Elétrica", stock: 32, minStock: 10, unit: "un", cost: 7.5, location: "C-02-03" },
    { id: "part-007", code: "VED-OR-25", name: "Kit de vedação O-ring", category: "Vedação", stock: 2, minStock: 5, unit: "kit", cost: 54.9, location: "A-03-02" },
    { id: "part-008", code: "GRX-EP2", name: "Graxa EP2", category: "Lubrificantes", stock: 14, minStock: 6, unit: "kg", cost: 42, location: "D-02-01" }
  ],
  orders: [
    { id: "os-001", number: "OS-2026-0148", equipmentId: "eq-003", title: "Vazamento no cilindro principal", description: "Identificado vazamento na região da haste do cilindro. Realizar inspeção do conjunto de vedação e teste de pressão após reparo.", type: "Corretiva", priority: "Crítica", status: "Em andamento", technicianId: "tec-003", openedAt: "2026-11-17", dueDate: "2026-11-19", completedAt: "", estimatedHours: 6, actualHours: 2.5, failureCause: "Desgaste do conjunto de vedação", partsUsed: [{ partId: "part-005", quantity: 4 }], interventions: [{ id: "int-001", date: "2026-11-17", technicianId: "tec-003", description: "Bloqueio e etiquetagem do equipamento. Iniciada desmontagem do conjunto.", hours: 2.5 }] },
    { id: "os-002", number: "OS-2026-0147", equipmentId: "eq-005", title: "Falha de posicionamento da torre", description: "Torno não conclui indexação da torre. Verificar sensor de referência, chicote e sinais no CLP.", type: "Corretiva", priority: "Alta", status: "Aguardando peças", technicianId: "tec-004", openedAt: "2026-11-16", dueDate: "2026-11-20", completedAt: "", estimatedHours: 4, actualHours: 1.5, failureCause: "Sensor de posição com leitura intermitente", partsUsed: [], interventions: [{ id: "int-002", date: "2026-11-16", technicianId: "tec-004", description: "Diagnóstico elétrico realizado. Confirmada necessidade de substituição do sensor.", hours: 1.5 }] },
    { id: "os-003", number: "OS-2026-0146", equipmentId: "eq-002", title: "Inspeção de vibração e temperatura", description: "Inspeção preventiva dos mancais, acoplamento e elemento filtrante.", type: "Preventiva", priority: "Média", status: "Aberta", technicianId: "tec-001", openedAt: "2026-11-18", dueDate: "2026-11-19", completedAt: "", estimatedHours: 2, actualHours: 0, failureCause: "", partsUsed: [], interventions: [] },
    { id: "os-004", number: "OS-2026-0145", equipmentId: "eq-001", title: "Lubrificação dos eixos", description: "Executar rotina de lubrificação e checar nível do reservatório centralizado.", type: "Preventiva", priority: "Alta", status: "Concluída", technicianId: "tec-001", openedAt: "2026-11-12", dueDate: "2026-11-14", completedAt: "2026-11-14", estimatedHours: 2, actualHours: 1.8, failureCause: "", partsUsed: [{ partId: "part-008", quantity: 1 }], interventions: [{ id: "int-003", date: "2026-11-14", technicianId: "tec-001", description: "Lubrificação concluída. Nível e pressão do sistema dentro do padrão.", hours: 1.8 }] },
    { id: "os-005", number: "OS-2026-0144", equipmentId: "eq-004", title: "Ajuste de tensionamento da esteira", description: "Ajustar tensão e verificar alinhamento da correia transportadora.", type: "Corretiva", priority: "Baixa", status: "Concluída", technicianId: "tec-002", openedAt: "2026-11-10", dueDate: "2026-11-12", completedAt: "2026-11-12", estimatedHours: 3, actualHours: 2.5, failureCause: "Alongamento natural da correia", partsUsed: [{ partId: "part-002", quantity: 1 }], interventions: [{ id: "int-004", date: "2026-11-12", technicianId: "tec-002", description: "Tensionamento ajustado e alinhamento conferido em vazio e sob carga.", hours: 2.5 }] },
    { id: "os-006", number: "OS-2026-0143", equipmentId: "eq-007", title: "Inspeção do dress pack", description: "Inspeção visual dos cabos e mangueiras do conjunto móvel do robô.", type: "Preventiva", priority: "Baixa", status: "Em andamento", technicianId: "tec-004", openedAt: "2026-11-17", dueDate: "2026-11-21", completedAt: "", estimatedHours: 2, actualHours: 0.5, failureCause: "", partsUsed: [], interventions: [{ id: "int-005", date: "2026-11-17", technicianId: "tec-004", description: "Inspeção visual iniciada. Sem danos críticos identificados até o momento.", hours: 0.5 }] },
    { id: "os-007", number: "OS-2026-0142", equipmentId: "eq-006", title: "Troca de selo mecânico", description: "Substituição do selo mecânico e teste de estanqueidade da bomba.", type: "Corretiva", priority: "Média", status: "Concluída", technicianId: "tec-003", openedAt: "2026-11-05", dueDate: "2026-11-07", completedAt: "2026-11-07", estimatedHours: 4, actualHours: 3.5, failureCause: "Ressecamento da vedação", partsUsed: [], interventions: [{ id: "int-006", date: "2026-11-07", technicianId: "tec-003", description: "Selo substituído. Teste de estanqueidade aprovado.", hours: 3.5 }] },
    { id: "os-008", number: "OS-2026-0141", equipmentId: "eq-005", title: "Revisão de proteção do torno", description: "Inspecionar proteções e intertravamentos do torno CNC.", type: "Corretiva", priority: "Baixa", status: "Cancelada", technicianId: "tec-002", openedAt: "2026-11-11", dueDate: "2026-11-13", completedAt: "", estimatedHours: 1.5, actualHours: 0, failureCause: "Solicitação interrompida pelo responsável da produção", partsUsed: [], interventions: [] }
  ],
  plans: [
    { id: "plan-001", equipmentId: "eq-002", title: "Inspeção geral do compressor", frequencyDays: 30, lastDate: "2026-10-20", nextDate: "2026-11-19", technicianId: "tec-001", status: "Programada" },
    { id: "plan-002", equipmentId: "eq-001", title: "Revisão de lubrificação CNC", frequencyDays: 7, lastDate: "2026-11-14", nextDate: "2026-11-21", technicianId: "tec-001", status: "Programada" },
    { id: "plan-003", equipmentId: "eq-005", title: "Verificação de sensores e torre", frequencyDays: 90, lastDate: "2026-08-17", nextDate: "2026-11-15", technicianId: "tec-004", status: "Atrasada" },
    { id: "plan-004", equipmentId: "eq-007", title: "Inspeção de cabos e conexões", frequencyDays: 30, lastDate: "2026-10-28", nextDate: "2026-11-28", technicianId: "tec-004", status: "Programada" },
    { id: "plan-005", equipmentId: "eq-004", title: "Inspeção de correias e roletes", frequencyDays: 60, lastDate: "2026-10-10", nextDate: "2026-12-09", technicianId: "tec-002", status: "Suspensa" }
  ]
};

const dateAtOffset = (base: Date, offset: number) => {
  const value = new Date(base);
  value.setDate(value.getDate() + offset);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const randomBetween = (minimum: number, maximum: number) =>
  Math.floor(Math.random() * (maximum - minimum + 1)) + minimum;

export const createDemoData = (): AppData => {
  const today = new Date();
  const activeDateRanges: Array<[number, number]> = [[-4, 8], [9, 24], [25, 42], [44, 60]];
  let activeIndex = 0;

  const orders = demoTemplate.orders.map((order, index) => {
    const isCompleted = order.status === "Concluída";
    const isFinalized = isCompleted || order.status === "Cancelada";
    const openedOffset = isFinalized
      ? randomBetween(-4, -2)
      : randomBetween(...activeDateRanges[activeIndex++ % activeDateRanges.length]);
    const openedAt = dateAtOffset(today, openedOffset);
    const finishOffset = isFinalized
      ? openedOffset + randomBetween(1, Math.min(2, -openedOffset))
      : 0;
    const completedAt = isCompleted ? dateAtOffset(today, finishOffset) : "";
    const dueDate = isCompleted
      ? completedAt
      : isFinalized
        ? dateAtOffset(today, finishOffset)
        : dateAtOffset(today, Math.min(60, openedOffset + randomBetween(1, 7)));
    const interventions = order.interventions.map(intervention => ({
      ...intervention,
      date: isCompleted ? completedAt : openedAt
    }));

    return {
      ...order,
      number: `OS-${today.getFullYear()}-${String(148 - index).padStart(4, "0")}`,
      openedAt,
      dueDate,
      completedAt,
      interventions
    };
  });

  return {
    equipment: demoTemplate.equipment.map(item => ({ ...item })),
    technicians: demoTemplate.technicians.map(item => ({ ...item })),
    parts: demoTemplate.parts.map(item => ({ ...item })),
    orders,
    plans: demoTemplate.plans.map(item => ({ ...item }))
  };
};
