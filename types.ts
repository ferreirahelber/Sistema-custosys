export enum Unit {
  G = 'g',
  KG = 'kg',
  ML = 'ml',
  L = 'l',
  UN = 'un'
}

export interface Employee {
  id: string;
  name: string;
  salary: number;
  hours_monthly: number;
}

export interface Settings {
  employees: Employee[];
  labor_monthly_cost: number;
  work_hours_monthly: number;
  fixed_overhead_rate: number;
  cost_per_minute: number;
}

// NOVA INTERFACE PARA CONVERSÕES
export interface MeasureConversion {
  name: string; // ex: 'Xícara', 'Colher de Sopa'
  value: number; // ex: 120 (quanto vale em g/ml)
}

export interface Ingredient {
  id: string;
  name: string;
  package_price: number;
  package_amount: number;
  package_unit: Unit;
  unit_cost_base: number;
  base_unit: 'g' | 'ml' | 'un';
  // NOVO CAMPO
  conversions?: MeasureConversion[];
  current_stock?: number; // Quantidade atual em base_unit (g/ml/un)
  min_stock?: number; // Quantidade mínima desejada em base_unit (g/ml/un)
}

export interface RecipeItem {
  id: string;
  ingredient_id: string;
  quantity_used: number; // Valor calculado em unidade base (g/ml) para custo
  // NOVOS CAMPOS PARA EXIBIÇÃO
  quantity_input?: number; // O que o usuário digitou (ex: 2)
  unit_input?: string; // A unidade que o usuário escolheu (ex: 'Xícara')
}

export interface Recipe {
  id: string;
  name: string;
  yield_units: number;
  preparation_time_minutes: number;
  items: RecipeItem[];
  
  total_cost_material: number;
  total_cost_labor: number;
  total_cost_overhead: number;
  total_cost_final: number;
  unit_cost: number;
}

export interface SimulationParams {
  tax_rate: number;
  card_fee: number;
  desired_margin: number;
}