export enum Unit {
  G = 'g',
  KG = 'kg',
  ML = 'ml',
  L = 'l',
  UN = 'un',
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
  estimated_monthly_revenue: number;
  default_tax_rate?: number;
  default_card_fee?: number;
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
  conversions?: MeasureConversion[];
  current_stock?: number; // Quantidade atual em base_unit (g/ml/un)
  min_stock?: number; // Quantidade mínima desejada em base_unit (g/ml/un)
  category?: 'ingredient' | 'product';
  barcode?: string;
}

export interface PriceHistory {
  id: string;
  recipe_id: string;
  old_cost: number;
  new_cost: number;
  old_price: number;
  new_price: number;
  change_reason?: string;
  changed_at: string;
}

export interface RecipeItem {
  id: string;
  ingredient_id: string;
  quantity_used: number; // Valor calculado em unidade base (g/ml) para custo
  // NOVOS CAMPOS PARA EXIBIÇÃO
  quantity_input?: number; // O que o usuário digitou (ex: 2)
  unit_input?: string; // A unidade que o usuário escolheu (ex: 'Xícara')
  ingredient_name?: string;
}

export interface Recipe {
  id: string;
  name: string;
  yield_units: number;
  preparation_time_minutes: number;
  preparation_method?: string;
  items: RecipeItem[];

  total_cost_material: number;
  total_cost_labor: number;
  total_cost_overhead: number;
  total_cost_final: number;
  unit_cost: number;
  selling_price?: number;
  barcode?: string;
}

export interface SimulationParams {
  tax_rate: number;
  card_fee: number;
  desired_margin: number;
}

export interface RecipeItemResponse {
  id: string;
  recipe_id: string;
  ingredient_id: string;
  quantity: number;        // No banco a coluna chama "quantity"
  quantity_input?: number;
  unit_input?: string;
  ingredient_name?: string;
  ingredient?: Ingredient; // O dado que vem do join com a tabela ingredients
}

export interface Sale {
  id: string;
  user_id: string;
  description: string;
  amount: number; // Valor da venda
  category: string;
  date: string;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number; // Valor da despesa
  category: string;
  date: string;
  created_at: string;
}

// --- MÓDULO FRENTE DE CAIXA (PDV) ---

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: 'recipe' | 'product'; // Para saber se é receita ou revenda
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  cpf_cnpj?: string;
  notes?: string;
}

export interface CashSession {
  id: string;
  user_id: string;
  opened_at: string;
  closed_at?: string;
  initial_balance: number;
  final_balance?: number;
  calculated_balance?: number; // Quanto o sistema acha que tem
  status: 'open' | 'closed';
  notes?: string;
}

export interface Order {
  id: string;
  session_id: string;
  customer_id?: string;
  customer_name?: string; // Para facilitar exibição
  total_amount: number;
  discount: number;
  change_amount: number;
  payment_method: string;
  status: 'completed' | 'canceled';
  created_at: string;
  items?: OrderItem[]; // Opcional, carregado sob demanda
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  type: 'recipe' | 'product';
}