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
  card_debit_rate: number;
  card_credit_rate: number;
}

export interface MeasureConversion {
  name: string;
  value: number;
}

export interface Ingredient {
  id?: string;
  name: string;
  category?: string; // 'food' | 'packaging'
  barcode?: string;

  // --- Campos Novos (Pacote Fechado) ---
  package_price?: number;
  package_amount?: number;
  package_unit?: string;

  // --- Campos de Custo Real ---
  unit_cost_base?: number;
  base_unit?: string;

  // --- Campos de Estoque ---
  current_stock?: number;
  min_stock?: number;

  // --- Campos Legados/Compatibilidade ---
  price?: number; 
  unit?: string; 

  // --- Outros ---
  conversions?: any[];
}

// --- NOVA INTERFACE QUE FALTAVA ---
export interface Product {
  id: string;
  name: string;
  price: number;       // Preço de Venda
  cost_price?: number; // Preço de Custo Unitário
  type?: 'recipe' | 'resale'; 

  // Dados de compra (Revenda)
  package_price?: number;
  package_amount?: number;
  profit_margin?: number;
  barcode?: string;
  category?: string;
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
  quantity_used: number;
  quantity_input?: number;
  unit_input?: string;
  ingredient_name?: string;
  unit_price?: number; // Para ajudar nos cálculos de impressão
  ingredient?: Ingredient; // O objeto completo do ingrediente (vindo do join)
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
  category?: string;
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
  quantity: number;
  quantity_input?: number;
  unit_input?: string;
  ingredient_name?: string;
  ingredient?: Ingredient;
}

export interface Sale {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
  fee_amount?: number; 
  net_amount?: number;
  payment_method?: string; // Adicionado para evitar erro no SalesView
}

export interface Expense {
  id: string;
  user_id: string;
  description: string;
  amount: number;
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
  // Atualizado para aceitar 'resale' que vem do banco
  type?: 'recipe' | 'product' | 'resale'; 
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
  calculated_balance?: number;
  status: 'open' | 'closed';
  notes?: string;
}

export interface Order {
  id: string;
  session_id: string;
  customer_id?: string;
  customer_name?: string;
  total_amount: number;
  discount: number;
  change_amount: number;
  payment_method: string;
  status: 'completed' | 'canceled';
  created_at: string;
  fee_amount?: number;
  net_amount?: number;
  items?: OrderItem[];
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  // Atualizado para aceitar 'resale'
  type?: 'recipe' | 'product' | 'resale';
}

export interface Category {
  id: number;
  name: string;
}