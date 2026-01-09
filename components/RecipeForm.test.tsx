import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RecipeForm } from './RecipeForm';
import { IngredientService } from '../services/ingredientService';
import { RecipeService } from '../services/recipeService';
import { SettingsService } from '../services/settingsService';
import { toast } from 'sonner';
import { MemoryRouter } from 'react-router-dom'; // Necessário para simular o roteamento

// Mocks dos Serviços
vi.mock('../services/ingredientService', () => ({
  IngredientService: { getAll: vi.fn() },
}));

vi.mock('../services/recipeService', () => ({
  RecipeService: { getAll: vi.fn(), save: vi.fn(), delete: vi.fn() },
}));

vi.mock('../services/settingsService', () => ({
  SettingsService: { get: vi.fn() },
}));

vi.mock('sonner', () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

// Mock do React Router (useNavigate)
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('RecipeForm Component (Refatorado)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (IngredientService.getAll as any).mockResolvedValue([]);
    (RecipeService.getAll as any).mockResolvedValue([]);
    (SettingsService.get as any).mockResolvedValue({
      labor_monthly_cost: 0, work_hours_monthly: 160, fixed_overhead_rate: 0, cost_per_minute: 0, employees: []
    });
  });

  it('deve exibir alerta ao tentar salvar sem nome', async () => {
    // Envolvemos no MemoryRouter pois o componente usa useParams e useNavigate
    render(
      <MemoryRouter>
        <RecipeForm />
      </MemoryRouter>
    );

    // Aguarda o título aparecer (confirma que carregou)
    await waitFor(() => expect(screen.getByText(/Nova Receita/i)).toBeInTheDocument());

    // Clica em Salvar diretamente (não precisa mais navegar entre abas)
    const saveButton = screen.getByText(/Salvar/i); 
    fireEvent.click(saveButton);

    expect(toast.warning).toHaveBeenCalledWith('Por favor, dê um nome para a receita.');
    expect(RecipeService.save).not.toHaveBeenCalled();
  });

  it('deve exibir alerta ao tentar salvar sem ingredientes', async () => {
    render(
      <MemoryRouter>
        <RecipeForm />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/Nova Receita/i)).toBeInTheDocument());

    // Preenche o nome
    const nameInput = screen.getByPlaceholderText(/Ex: Bolo de Cenoura/i);
    fireEvent.change(nameInput, { target: { value: 'Receita de Teste' } });

    // Tenta salvar sem itens
    const saveButton = screen.getByText(/Salvar/i);
    fireEvent.click(saveButton);

    expect(toast.warning).toHaveBeenCalledWith('Adicione pelo menos um ingrediente.');
    expect(RecipeService.save).not.toHaveBeenCalled();
  });
});