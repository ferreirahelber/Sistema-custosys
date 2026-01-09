import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CostingView } from './CostingView';
import { RecipeService } from '../services/recipeService';
import { toast } from 'sonner';

// 1. Mocks
vi.mock('../services/recipeService', () => ({
  RecipeService: {
    getAll: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// 2. Dados Fictícios para o Teste
const mockRecipes = [
  {
    id: 'r1',
    name: 'Bolo de Cenoura',
    unit_cost: 10.0,
    total_cost_material: 5,
    total_cost_labor: 3,
    total_cost_overhead: 2,
    total_cost_final: 10,
    yield_units: 1,
    selling_price: 0, // Sem preço salvo
  },
  {
    id: 'r2',
    name: 'Brigadeiro Gourmet',
    unit_cost: 0.5,
    total_cost_material: 0.2,
    total_cost_labor: 0.2,
    total_cost_overhead: 0.1,
    total_cost_final: 0.5,
    yield_units: 50,
    selling_price: 1.50, // Com preço salvo
  }
];

describe('CostingView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (RecipeService.getAll as any).mockResolvedValue(mockRecipes);
  });

  const waitForLoad = async () => {
    await waitFor(() => {
        expect(screen.getByText(/Selecione uma Receita para Simular/i)).toBeInTheDocument();
    });
  };

  it('deve carregar a lista de receitas no select', async () => {
    render(<CostingView />);
    await waitForLoad();

    expect(screen.getByText('Bolo de Cenoura')).toBeInTheDocument();
    expect(screen.getByText('Brigadeiro Gourmet')).toBeInTheDocument();
  });

  it('deve exibir custos e modo margem ao selecionar receita sem preço salvo', async () => {
    render(<CostingView />);
    await waitForLoad();

    // Seleciona "Bolo de Cenoura" (ID r1)
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'r1' } });

    // Verifica se mostrou a estrutura de custos
    expect(screen.getByText('Estrutura de Custos')).toBeInTheDocument();
    
    // CORREÇÃO: Usamos getAllByText pois o valor "R$ 10.00" aparece múltiplas vezes
    // (Custo Unitário, Custo Total, e no resumo do lado direito)
    const prices = screen.getAllByText('R$ 10.00');
    expect(prices.length).toBeGreaterThan(0);

    // Verifica se está no modo "Margem" (Slide de porcentagem visível)
    expect(screen.getByText('Margem de Lucro')).toBeInTheDocument();
  });

  it('deve alternar automaticamente para modo Preço se a receita já tiver valor salvo', async () => {
    render(<CostingView />);
    await waitForLoad();

    // Seleciona "Brigadeiro" (ID r2)
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'r2' } });

    // Verifica se o input de Preço (manual) está visível com o valor 1.50
    const priceInput = screen.getByDisplayValue('1.50');
    expect(priceInput).toBeInTheDocument();
  });

  it('deve salvar o preço calculado ao clicar no botão', async () => {
    render(<CostingView />);
    await waitForLoad();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'r1' } });

    const saveButton = screen.getByText(/Salvar este Preço/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
        expect(RecipeService.update).toHaveBeenCalledWith('r1', expect.objectContaining({
            selling_price: expect.any(Number)
        }));
        expect(toast.success).toHaveBeenCalled();
    });
  });
});