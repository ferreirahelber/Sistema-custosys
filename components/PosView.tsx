import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PosService } from '../services/posService';
import { CategoryService } from '../services/categoryService';
import { CashModal } from './CashModal';
import { PaymentModal } from './PaymentModal';
import { CartPanel } from './CartPanel';
import { CartItem, CashSession, Category } from '../types';
import {
  ShoppingCart, Trash2, CreditCard, Banknote, QrCode, Plus, Minus, Search,
  ChefHat, LogOut, Printer, CheckCircle, History, ShoppingBag, Tag, Store, ReceiptText, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { Receipt } from './Receipt';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function PosView() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Estados do Sistema
  const [session, setSession] = useState<CashSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [closingSummary, setClosingSummary] = useState<any>(null);

  // Estado para conferência de caixa
  const [showConference, setShowConference] = useState(false);
  const [currentSessionSummary, setCurrentSessionSummary] = useState<any>(null);

  // Estado para modal de caixa fechado
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);

  // Estado para o modal de pagamento em dinheiro
  const [showCashModal, setShowCashModal] = useState(false);

  // Estados de Dados
  const [sellableItems, setSellableItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Mobile Cart State
  const [showMobileCart, setShowMobileCart] = useState(false);

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

  // 2. Carregar Catálogo
  async function loadCatalog() {
    try {
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
      setIsCashModalOpen(false); // Fecha o modal após abrir
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

  // Função para carregar conferência rápida
  const handleConference = async () => {
    if (showConference) {
      setShowConference(false);
      return;
    }

    if (!session) return;

    try {
      const summary = await PosService.getSessionSummary(session.id);
      setCurrentSessionSummary({
        ...summary,
        initial: session.initial_balance
      });
      setShowConference(true);
    } catch (error) {
      toast.error('Erro ao carregar resumo');
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
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // 5. Checkout
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
      setShowMobileCart(false); // Fechar carrinho mobile
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

      const itemByBarcode = filteredItems.find(i => String(i.name).toLowerCase() === term.toLowerCase());

      if (itemByBarcode) {
        addToCart(itemByBarcode);
        setSearchTerm('');
        toast.success(`${itemByBarcode.name} adicionado!`);
        return;
      }

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

  const filteredItems = sellableItems.filter(i => {
    const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || i.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loadingSession) return <div className="p-10 text-center">Carregando sistema de caixa...</div>;

  // --- TELA DE CAIXA FECHADO ---
  if (!session) {
    return (
      <div className="h-[calc(100vh-100px)] flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6 animate-fade-in relative z-10">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Store className="w-10 h-10 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Frente de Caixa Fechado</h2>
            <p className="text-gray-500 mt-2">Abra uma nova sessão para começar a vender.</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setIsCashModalOpen(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-xl font-medium transition-all transform hover:scale-105 shadow-lg shadow-blue-600/20"
            >
              Abrir Caixa
            </button>

            <button
              onClick={signOut}
              className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 py-3 px-6 rounded-xl font-medium transition-colors"
            >
              <LogOut size={18} />
              Sair do Sistema
            </button>
          </div>
        </div>

        {isCashModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
            <div className="bg-white rounded-xl p-4 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
              <CashModal
                type="open"
                onConfirm={handleOpenSession}
                onCancel={() => setIsCashModalOpen(false)}
                isProcessing={isProcessing}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- TELA DE CAIXA ABERTO ---
  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] gap-4 animate-fade-in relative">

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
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        </div>

        {/* BARRA DE CATEGORIAS */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex gap-2 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setSelectedCategory('Todas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${selectedCategory === 'Todas'
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
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${selectedCategory === cat.name
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => addToCart(item)}
                  className={`
                    bg-white border p-3 rounded-xl cursor-pointer transition group flex flex-col justify-between h-32 relative overflow-hidden
                    ${item.type === 'resale' ? 'border-emerald-200 hover:border-emerald-500' : 'border-slate-200 hover:border-amber-500'}
                    hover:shadow-md active:scale-95
                  `}
                >
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    {item.type === 'resale' ? (
                      <ShoppingBag size={40} className="text-emerald-500" />
                    ) : (
                      <ChefHat size={40} className="text-amber-500" />
                    )}
                  </div>
                  <span className="font-bold text-slate-700 line-clamp-2 relative z-10 text-sm leading-tight">{item.name}</span>
                  <div className={`font-bold text-base relative z-10 ${item.type === 'resale' ? 'text-emerald-600' : 'text-amber-600'}`}>
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

      {/* LADO DIREITO: CARRINHO (DESKTOP) - Escondido no Mobile */}
      <div className="hidden md:flex w-96">
        <CartPanel
          cart={cart}
          session={session}
          onRemoveItem={removeFromCart}
          onCheckout={handleCheckout}
          onOpenCloseSession={handleOpenCloseModal}
          onShowConference={handleConference}
          showConference={showConference}
          setShowConference={setShowConference}
          sessionSummary={currentSessionSummary}
        />
      </div>

      {/* MOBILE CART BOTTOM BAR - Só aparece se tiver itens e carrinho fechado */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] flex items-center justify-between z-40">
        <div>
          <p className="text-xs text-slate-500 font-medium">{cartItemCount} itens</p>
          <p className="text-xl font-bold text-slate-800">R$ {cartTotal.toFixed(2)}</p>
        </div>
        <button
          onClick={() => setShowMobileCart(true)}
          className="bg-slate-800 text-white px-6 py-2.5 rounded-lg font-bold flex items-center gap-2 animate-pulse"
        >
          Ver Carrinho <ChevronUp size={16} />
        </button>
      </div>

      {/* MOBILE CART OVERLAY (SHEET) */}
      {showMobileCart && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col bg-white animate-in slide-in-from-bottom duration-300">
          <CartPanel
            cart={cart}
            session={session}
            onRemoveItem={removeFromCart}
            onCheckout={handleCheckout}
            onOpenCloseSession={handleOpenCloseModal}
            onShowConference={handleConference}
            showConference={showConference}
            setShowConference={setShowConference}
            sessionSummary={currentSessionSummary}
            isMobile={true}
            onCloseMobile={() => setShowMobileCart(false)}
          />
        </div>
      )}

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