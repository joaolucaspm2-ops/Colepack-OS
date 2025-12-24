
export type ThemeMode = 'light' | 'dark';
export type DensityMode = 'compact' | 'comfortable';
export type UserRole = 'admin' | 'editor' | 'viewer';

export interface ServiceOrder {
  DT_INCLUSAO: string | Date;
  COD_EQP: string;
  DESC_EQP: string;
  COD_OS: string;
  CODIGO_DFT: string;
  DESC_DFT: string;
  SITUACAO: string;
  OBSERVACAO: string;
  DT_ABERTURA: string;
  HR_ABERTURA: string;
  DT_FECHAMENTO: string | null;
  HR_FECHAMENTO: string | null;
  TP_REALIZADO: number; // minutes
}

export interface DashboardFilters {
  machineCodes: string[];
  period: string; // "YYYY-MM"
  status: string;
}

export interface SavedScenario {
  id: string;
  name: string;
  filters: DashboardFilters;
  createdAt: string;
}

export interface KpiGoals {
  mttr: number;
  mtbf: number;
  availability: number;
}

export interface UserPreferences {
  theme: ThemeMode;
  density: DensityMode;
  role: UserRole;
  goals: KpiGoals;
}

export interface ImportHistory {
  id: string;
  date: string;
  fileName: string;
  count: number;
}
