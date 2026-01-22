import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PosService } from '../services/posService';
import { CategoryService } from '../services/categoryService';
import { CashModal } from './CashModal';
import { PaymentModal } from './PaymentModal';
import { CartItem, CashSession, Category } from '../types';
import {
  ShoppingCart, Trash2, CreditCard, Banknote, QrCode, Plus, Minus, Search,
  ChefHat, LogOut, Printer, CheckCircle, History, ShoppingBag, Tag
} from 'lucide-react';
import { toast } from 'sonner';
import { Receipt } from './Receipt';
import { Link } from 'react-router-dom';

export function PosView() {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Estados do Sistema
  const [session, setSession] = useState<CashSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [closingSummary, setClosingSummary] = useState<any>(null); 

  // Estado para o modal de pagamento em dinheiro
  const [showCashModal, setShowCashModal] = useState(false);

  // Estados de Dados
  const [sellableItems, setSellableItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Estado para Impressão e Modal de Sucesso
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrder, setLastOrder] = useState<{
    items: CartItem[];
    total: number;
    paymentMethod: string;
    date: Date;
    id?: string;
    change?: number;
    received?: number;
  } | null>(null);

  // 1. Verificar Caixa e Carregar Categorias
  useEffect(() => {
    checkSession();
    loadCategories();
  }, []);

  async function checkSession() {
    try {
      const current = await PosService.getCurrentSession();
      setSession(current);
      if (current) loadCatalog();
    } catch (error) {
      toast.error('Erro ao verificar caixa');
    } finally {
      setLoadingSession(false);
    }
  }

  async function loadCategories() {
    try {
      const cats = await CategoryService.getAll();
      setCategories(cats);
    } catch (error) {
      console.error(error);
    }
  }

  // 2. Carregar Catálogo (CORRIGIDO PARA BUSCAR TUDO)
  async function loadCatalog() {
    try {
      // Agora chamamos o PosService que traz Receitas E Produtos juntos
      const allItems = await PosService.getAllProductsForPOS();
      setSellableItems(allItems);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar catálogo de produtos');
    } finally {
      setLoadingCatalog(false);
    }
  }

  // 3. Ações de Caixa
  const handleOpenSession = async (amount: number, notes: string) => {
    setIsProcessing(true);
    try {
      const newSession = await PosService.openSession(amount);
      setSession(newSession);
      toast.success('Caixa aberto com sucesso!');
      loadCatalog();
    } catch (error) {
      toast.error('Erro ao abrir caixa');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseSession = async (amount: number, notes: string) => {
    if (!session) return;
    setIsProcessing(true);
    try {
      await PosService.closeSession(session.id, amount, notes);
      setSession(null);
      setCart([]);
      setShowCloseModal(false);
      toast.success('Caixa fechado com sucesso!');
      navigate('/'); 
    } catch (error) {
      toast.error('Erro ao fechar caixa');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenCloseModal = async () => {
    if (!session) return;
    setIsProcessing(true);
    try {
      const summary = await PosService.getSessionSummary(session.id);
      setClosingSummary({
        ...summary,
        initial: session.initial_balance
      });
      setShowCloseModal(true);
    } catch (error) {
      toast.error('Erro ao calcular fechamento');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Ações do Carrinho
  const addToCart = (item: any) => {
    if (item.price <= 0) {
      toast.warning(`O item "${item.name}" está sem preço de venda.`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1, type: item.type }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  // 5. Checkout (Lógica Principal)
  const handleCheckout = async (paymentMethod: string) => {
    if (cart.length === 0 || !session) return;

    if (paymentMethod === 'Dinheiro') {
      setShowCashModal(true);
      return;
    }

    await processSaleComplete(paymentMethod, 0, cartTotal);
  };

  const handleConfirmCash = async (received: number, change: number) => {
    setShowCashModal(false);
    await processSaleComplete('Dinheiro', change, received);
  };

  const processSaleComplete = async (method: string, changeAmount: number, receivedAmount: number) => {
    if (!session) return;

    try {
      const newOrder = await PosService.processSale({
        session_id: session.id,
        total_amount: cartTotal,
        discount: 0,
        change_amount: changeAmount,
        payment_method: method,
        status: 'completed'
      }, cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        type: item.type
      })));

      const orderData = {
        items: [...cart],
        total: cartTotal,
        paymentMethod: method,
        date: new Date(),
        id: newOrder.id,
        change: changeAmount,
        received: receivedAmount
      };

      setLastOrder(orderData);
      setCart([]);
      setShowSuccessModal(true);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar venda');
    }
  };

  const handlePrintReceipt = () => {
    window.print();
    setShowSuccessModal(false);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  const handleNewSale = () => {
    setShowSuccessModal(false);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  };

  // Lógica de Busca
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const term = searchTerm.trim();
      if (!term) return;
      
      // Busca exata (pode ser código de barras ou nome)
      const itemByBarcode = filteredItems.find(i => String(i.name).toLowerCase() === term.toLowerCase());
      
      if (itemByBarcode) {
        addToCart(itemByBarcode);
        setSearchTerm('');
        toast.success(`${itemByBarcode.name} adicionado!`);
        return;
      }

      // Busca parcial
      const filtered = filteredItems.filter(i => i.name.toLowerCase().includes(term.toLowerCase()));
      if (filtered.length === 1) {
        addToCart(filtered[0]);
        setSearchTerm('');
        toast.success(`${filtered[0].name} adicionado!`);
      } else if (filtered.length === 0) {
        toast.error('Produto não encontrado');
      }
    }
  };

  // --- FILTRAGEM ---
  const filteredItems = sellableItems.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || i.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // --- RENDERIZAÇÃO ---

  if (loadingSession) return <div className="p-10 text-center">Carregando sistema de caixa...</div>;

  if (!session) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center bg-slate-100 rounded-xl relative">
        <CashModal
          type="open"
          onConfirm={handleOpenSession}
          onCancel={() => navigate('/')}
          isProcessing={isProcessing}
        />
        <div className="text-center opacity-50">
          <p>O caixa está fechado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-100px)] gap-4 animate-fade-in relative">
      
      {showCashModal && (
        <PaymentModal 
          total={cartTotal}
          onConfirm={handleConfirmCash}
          onCancel={() => setShowCashModal(false)}
        />
      )}

      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="mx-auto bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mb-4 text-emerald-600">
              <CheckCircle size={48} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Venda Realizada!</h2>
            <p className="text-slate-500 mb-4">O pedido foi salvo com sucesso.</p>
            
            {lastOrder?.change && lastOrder.change > 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-amber-700 font-bold uppercase">Troco a Devolver</p>
                <p className="text-2xl font-black text-amber-600">R$ {lastOrder.change.toFixed(2)}</p>
              </div>
            ) : null}

            <div className="space-y-3">
              <button
                onClick={handlePrintReceipt}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Printer size={20} /> Imprimir Comprovante
              </button>
              <button
                onClick={handleNewSale}
                className="w-full bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-600 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Plus size={20} /> Nova Venda
              </button>
            </div>
          </div>
        </div>
      )}

      {showCloseModal && (
        <CashModal
          type="close"
          onConfirm={handleCloseSession}
          onCancel={() => setShowCloseModal(false)}
          isProcessing={isProcessing}
          summary={closingSummary}
        />
      )}

      {/* LADO ESQUERDO: CATÁLOGO */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Barra de Busca */}
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar Receita ou Produto..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        </div>

        {/* BARRA DE CATEGORIAS (NOVA) */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex gap-2 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setSelectedCategory('Todas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
              selectedCategory === 'Todas' 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Tag size={12} className="inline mr-1" /> Todas
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat.name 
                  ? 'bg-slate-800 text-white shadow-md' 
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Grid de Produtos */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {loadingCatalog ? (
            <p className="text-center text-slate-400 mt-10">Carregando catálogo...</p>
          ) : filteredItems.length === 0 ? (
            <div className="text-center text-slate-400 mt-10">
              <p>Nenhum item encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`
                    bg-white border p-4 rounded-xl cursor-pointer transition group flex flex-col justify-between h-32 relative overflow-hidden
                    ${item.type === 'resale' ? 'border-emerald-200 hover:border-emerald-500' : 'border-slate-200 hover:border-amber-500'}
                    hover:shadow-md active:scale-95
                  `}
                >
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    {/* ÍCONE DINÂMICO: Se for revenda usa Sacola, senão usa Chapéu de Chef */}
                    {item.type === 'resale' ? (
                       <ShoppingBag size={40} className="text-emerald-500" />
                    ) : (
                       <ChefHat size={40} className="text-amber-500" />
                    )}
                  </div>
                  <span className="font-bold text-slate-700 line-clamp-2 relative z-10">{item.name}</span>
                  <div className={`font-bold text-lg relative z-10 ${item.type === 'resale' ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {item.price > 0
                      ? `R$ ${item.price.toFixed(2)}`
                      : <span className="text-red-400 text-xs">Sem preço</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LADO DIREITO: CARRINHO */}
      <div className="w-full md:w-96 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
        <div className="p-4 bg-slate-800 text-white rounded-t-xl flex justify-between items-center">
          <div>
            <h3 className="font-bold flex items-center gap-2"><ShoppingCart size={20} /> PDV Aberto</h3>
            <p className="text-xs text-slate-400">Session ID: {session?.id.slice(0, 8)}...</p>
          </div>
          <div className="flex gap-2">
            <Link to="/cash-history" className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition" title="Histórico">
              <History size={20} />
            </Link>
            <button
              onClick={handleOpenCloseModal}
              className="p-2 hover:bg-slate-700 rounded-lg text-rose-300 hover:text-rose-200 transition"
              title="Fechar Caixa"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
              <ShoppingCart size={48} className="mb-2" />
              <p>Carrinho Vazio</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm animate-in slide-in-from-right-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {/* Indicador visual no carrinho também */}
                    {item.type === 'resale' ? (
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                    ) : (
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                    )}
                    <p className="text-sm font-bold text-slate-700 line-clamp-1">{item.name}</p>
                  </div>
                  <p className="text-xs text-slate-500">{item.quantity} x R$ {item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-bold text-slate-700">R$ {(item.quantity * item.price).toFixed(2)}</div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-white border-t border-slate-200 rounded-b-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-end mb-4">
            <span className="text-slate-500 font-medium">Total a Pagar</span>
            <span className="text-4xl font-bold text-emerald-600">R$ {cartTotal.toFixed(2)}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleCheckout('Dinheiro')}
              disabled={cart.length === 0}
              className="flex flex-col items-center gap-1 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition disabled:opacity-50 active:scale-95"
            >
              <Banknote size={24} />
              <span className="text-xs font-bold uppercase">Dinheiro</span>
            </button>
            <button
              onClick={() => handleCheckout('PIX')}
              disabled={cart.length === 0}
              className="flex flex-col items-center gap-1 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition disabled:opacity-50 active:scale-95"
            >
              <QrCode size={24} />
              <span className="text-xs font-bold uppercase">PIX</span>
            </button>
            <button
              onClick={() => handleCheckout('Débito')}
              disabled={cart.length === 0}
              className="flex flex-col items-center gap-1 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-sky-500 hover:bg-sky-50 hover:text-sky-700 transition disabled:opacity-50 active:scale-95"
            >
              <CreditCard size={24} />
              <span className="text-xs font-bold uppercase">Débito</span>
            </button>
            <button
              onClick={() => handleCheckout('Crédito')}
              disabled={cart.length === 0}
              className="flex flex-col items-center gap-1 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 hover:text-orange-700 transition disabled:opacity-50 active:scale-95"
            >
              <CreditCard size={24} />
              <span className="text-xs font-bold uppercase">Crédito</span>
            </button>
          </div>
        </div>
      </div>

      {lastOrder && (
        <Receipt
          items={lastOrder.items}
          total={lastOrder.total}
          paymentMethod={lastOrder.paymentMethod}
          date={lastOrder.date}
          orderId={lastOrder.id}
        />
      )}
    </div>
  );
}