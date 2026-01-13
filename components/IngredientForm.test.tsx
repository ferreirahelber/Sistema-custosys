import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IngredientForm } from './IngredientForm';
import { IngredientService } from '../services/ingredientService';
import { toast } from 'sonner';

// Mock dos Serviços
vi.mock('../services/ingredientService', () => ({
  IngredientService: {
    getAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

describe('IngredientForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (IngredientService.getAll as any).mockResolvedValue([]);
  });

  // Helper para aguardar o carregamento inicial
  const waitForLoad = async () => {
    await waitFor(() => {
      expect(screen.queryByText(/Nenhum ingrediente encontrado nesta categoria/i)).toBeInTheDocument();
    });
  };

  it('deve renderizar os campos principais corretamente (Modo Ingrediente)', async () => {
    render(<IngredientForm type="ingredient" />);
    await waitForLoad();
    
    // Abre o formulário
    const createButton = screen.getByRole('button', { name: /Criar Novo/i });
    fireEvent.click(createButton);

    // CORREÇÃO: Usamos getAllByText para pegar todas as ocorrências (filho e pai) 
    // e verificamos se pelo menos uma existe. Isso resolve o erro "Multiple elements found".
    const titles = screen.getAllByText((content, element) => {
      return element?.textContent?.includes('Novo Ingrediente') ?? false;
    });
    expect(titles.length).toBeGreaterThan(0);

    // Verifica se os campos específicos apareceram
    expect(screen.getByPlaceholderText(/Ex: Farinha de Trigo/i)).toBeInTheDocument();
    
    // Mesmo tratamento para "Controle de Estoque" para evitar fragilidade
    const stockHeaders = screen.getAllByText((content, element) => {
      return element?.textContent?.includes('Controle de Estoque') ?? false;
    });
    expect(stockHeaders.length).toBeGreaterThan(0);
  });

  it('deve exibir alerta ao tentar salvar com campos vazios', async () => {
    render(<IngredientForm type="ingredient" />);
    await waitForLoad();

    // Abre o formulário
    const createButton = screen.getByRole('button', { name: /Criar Novo/i });
    fireEvent.click(createButton);

    // Tenta salvar sem preencher nada
    const saveButton = screen.getByText(/Cadastrar Item/i);
    fireEvent.click(saveButton);

    expect(toast.warning).toHaveBeenCalledWith('Preencha os campos obrigatórios');
    expect(IngredientService.create).not.toHaveBeenCalled();
  });

  it('deve enviar os dados corretamente quando o formulário é válido', async () => {
    render(<IngredientForm type="ingredient" />);
    await waitForLoad();

    // Abre o formulário
    const createButton = screen.getByRole('button', { name: /Criar Novo/i });
    fireEvent.click(createButton);

    // Preenche os campos
    const nameInput = screen.getByPlaceholderText(/Ex: Farinha de Trigo/i);
    fireEvent.change(nameInput, { target: { value: 'Farinha Premium' } });

    const priceInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(priceInput, { target: { value: '10.00' } });

    // O input de quantidade é o segundo campo numérico (o primeiro é o preço)
    const inputs = screen.getAllByRole('spinbutton');
    const amountInput = inputs[1]; 
    fireEvent.change(amountInput, { target: { value: '1' } }); 

    // Salvar
    const saveButton = screen.getByText(/Cadastrar Item/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(IngredientService.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Farinha Premium',
        package_price: 10,
        package_amount: 1,
        category: 'ingredient'
      }));
      expect(toast.success).toHaveBeenCalledWith('Ingrediente criado!');
    });
  });
});