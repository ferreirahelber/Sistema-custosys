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
  salary: number; // Salário + Encargos
  hours_monthly: number;
}

export interface Settings {
  employees: Employee[];
  labor_monthly_cost: number; // Total calculado
  work_hours_monthly: number; // Total calculado
  fixed_overhead_rate: number; // 0.1 for 10%
  // Computed helpers
  cost_per_minute: number;
}

export interface Ingredient {
  id: string;
  name: string;
  package_price: number;
  package_amount: number;
  package_unit: Unit;
  unit_cost_base: number; // Cost per base unit (g, ml, or un)
  base_unit: 'g' | 'ml' | 'un'; // Normalized unit type
}

export interface RecipeItem {
  id: string;
  ingredient_id: string;
  quantity_used: number; // In base units (g, ml, un)
}

export interface Recipe {
  id: string;
  name: string;
  yield_units: number;
  preparation_time_minutes: number;
  items: RecipeItem[];
  
  // Computed Financials
  total_cost_material: number;
  total_cost_labor: number;
  total_cost_overhead: number;
  total_cost_final: number;
  unit_cost: number;
}

export interface SimulationParams {
  tax_rate: number; // %
  card_fee: number; // %
  desired_margin: number; // %
}