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
      expect(screen.queryByText(/Nenhum ingrediente cadastrado/i)).toBeInTheDocument();
    });
  };

  it('deve renderizar os campos principais corretamente', async () => {
    render(<IngredientForm />);
    await waitForLoad();
    
    expect(screen.getByText(/Novo Ingrediente/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: Embalagem Bombom/i)).toBeInTheDocument();
    expect(screen.getByText(/Lançamento de Estoque/i)).toBeInTheDocument();
  });

  it('deve exibir alerta ao tentar salvar com campos vazios', async () => {
    render(<IngredientForm />);
    await waitForLoad();

    // CORREÇÃO: Desabilitar validação HTML5 (required) para permitir que o onSubmit do React dispare
    // e possamos testar a validação manual do código (o toast.warning)
    const form = document.getElementById('ing-form') as HTMLFormElement;
    if (form) form.noValidate = true;

    // Tenta clicar em "Salvar Item"
    const saveButton = screen.getByText(/Salvar Item/i);
    fireEvent.click(saveButton);

    // Agora o onSubmit deve rodar e chamar o toast
    expect(toast.warning).toHaveBeenCalledWith('Preencha o nome, preço e quantidade da embalagem.');
    expect(IngredientService.create).not.toHaveBeenCalled();
  });

  it('deve enviar os dados corretamente quando o formulário é válido', async () => {
    render(<IngredientForm />);
    await waitForLoad();

    // Preenche o formulário
    const nameInput = screen.getByPlaceholderText(/Ex: Embalagem Bombom/i);
    fireEvent.change(nameInput, { target: { value: 'Farinha Premium' } });

    const priceInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(priceInput, { target: { value: '10.00' } });

    const amountInput = screen.getByPlaceholderText('Ex: 100');
    fireEvent.change(amountInput, { target: { value: '1' } }); 

    // Clica em Salvar
    const saveButton = screen.getByText(/Salvar Item/i);
    fireEvent.click(saveButton);

    // Verifica sucesso
    await waitFor(() => {
      expect(IngredientService.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Farinha Premium',
        package_price: 10,
        package_amount: 1,
      }));
      expect(toast.success).toHaveBeenCalledWith('Ingrediente salvo!');
    });
  });
});