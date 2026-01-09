import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppContent } from './App';
import { MemoryRouter } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { SettingsService } from './services/settingsService';
import { RecipeService } from './services/recipeService';
import { IngredientService } from './services/ingredientService';

// --- MOCKS GLOBAIS ---
vi.mock('./contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('./services/settingsService', () => ({
  SettingsService: { get: vi.fn() }
}));
vi.mock('./services/recipeService', () => ({
  RecipeService: { getAll: vi.fn() }
}));
vi.mock('./services/ingredientService', () => ({
  IngredientService: { getAll: vi.fn() }
}));

// Mock para evitar erros de Canvas/Charts no Dashboard (se houver)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('Integração: Navegação Principal do App', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // 1. Simula Usuário Logado
    (useAuth as any).mockReturnValue({
      session: { user: { id: 'user-123', email: 'teste@custosys.com' } },
      loading: false,
      signOut: vi.fn(),
    });

    // 2. Simula Configurações Carregadas
    (SettingsService.get as any).mockResolvedValue({
      labor_monthly_cost: 2000, 
      fixed_overhead_rate: 0,
    });

    // 3. Simula Listas Vazias
    (RecipeService.getAll as any).mockResolvedValue([]);
    (IngredientService.getAll as any).mockResolvedValue([]);
  });

  // HELPER: Aguarda o app sair do estado de "Loading"
  const waitForAppLoad = async () => {
    // Espera até que o texto "Custosys" apareça, o que indica que o loading sumiu e o menu renderizou
    await waitFor(() => {
      expect(screen.getByText('Custosys')).toBeInTheDocument();
    });
  };

  it('deve renderizar o Dashboard (Visão Geral) inicialmente', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppContent />
      </MemoryRouter>
    );

    // CORREÇÃO: Aguarda o carregamento inicial antes de fazer asserções
    await waitForAppLoad();

    // Verifica se o Menu Lateral está visível
    expect(screen.getByText('Visão Geral')).toBeInTheDocument();
    
    // Verifica se o botão "Sair" está presente
    expect(screen.getByText('Sair')).toBeInTheDocument();
  });

  it('deve navegar para a tela de Receitas ao clicar no menu', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AppContent />
      </MemoryRouter>
    );

    await waitForAppLoad();

    // Encontra o link do menu
    const recipeLink = screen.getByText('Minhas Receitas');
    
    // Clica no link
    fireEvent.click(recipeLink);

    // Verifica se a navegação ocorreu
    await waitFor(() => {
      // Verifica um texto exclusivo da tela de lista de receitas
      // Baseado no seu RecipeList.tsx, ele tem "Gerencie suas fichas técnicas"
      expect(screen.getByText(/Gerencie suas fichas técnicas/i)).toBeInTheDocument();
    });
  });

  it('deve mostrar alerta de configuração se o usuário não tiver configurado custos', async () => {
    // Sobrescreve o mock para simular configuração zerada
    (SettingsService.get as any).mockResolvedValue({ labor_monthly_cost: 0 });

    render(
      <MemoryRouter initialEntries={['/']}>
        <AppContent />
      </MemoryRouter>
    );

    // Não usamos waitForAppLoad aqui porque queremos verificar um estado específico que pode aparecer junto
    await waitFor(() => {
        expect(screen.getByText('Custosys')).toBeInTheDocument();
        expect(screen.getByText('Atenção:')).toBeInTheDocument();
        expect(screen.getByText(/Configure seus custos fixos/i)).toBeInTheDocument();
    });
  });
});