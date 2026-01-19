import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecipeService } from '../services/recipeService';
import { IngredientService } from '../services/ingredientService';
import { PosService } from '../services/posService';
import { CashModal } from './CashModal';
import { CartItem, CashSession } from '../types';
import { 
  ShoppingCart, Trash2, CreditCard, Banknote, QrCode, Plus, Minus, Search, 
  ChefHat, Package, LogOut, Lock, Printer, CheckCircle, X
} from 'lucide-react';
import { toast } from 'sonner';
import { Receipt } from './Receipt';

export function PosView() {
  const navigate = useNavigate();
  
  // Estados do Sistema
  const [session, setSession] = useState<CashSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Estados de Dados
  const [sellableItems, setSellableItems] = useState<any[]>([]);
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
  } | null>(null);

  // 1. Verificar Caixa
  useEffect(() => {
    checkSession();
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

  // 2. Carregar Catálogo
  async function loadCatalog() {
    try {
      const [recipes, ingredients] = await Promise.all([
        RecipeService.getAll(),
        IngredientService.getAll()
      ]);

      const recipeItems = recipes.map(r => ({
        id: r.id,
        name: r.name,
        price: r.selling_price || 0,
        type: 'recipe',
        category: 'Confeitaria'
      }));

      const productItems = ingredients
        .filter(i => i.base_unit === 'un')
        .map(p => ({
          id: p.id,
          name: p.name,
          price: (p.unit_cost_base || 0) * 2.0,
          type: 'product',
          category: 'Revenda'
        }));

      setSellableItems([...recipeItems, ...productItems]);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar catálogo');
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
    } catch (error) {
      toast.error('Erro ao fechar caixa');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Ações do Carrinho
  const addToCart = (item: any) => {
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

  // 5. Checkout (ATUALIZADO)
  const handleCheckout = async (paymentMethod: string) => {
    if (cart.length === 0 || !session) return;

    try {
      // Salva no Banco
      const newOrder = await PosService.processSale({
        session_id: session.id,
        total_amount: cartTotal,
        discount: 0,
        change_amount: 0,
        payment_method: paymentMethod,
        status: 'completed'
      }, cart.map(item => ({
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
        type: item.type
      })));

      // Configura dados do pedido atual
      const orderData = {
        items: [...cart],
        total: cartTotal,
        paymentMethod,
        date: new Date(),
        id: newOrder.id
      };
      
      setLastOrder(orderData);
      setCart([]); // Limpa carrinho
      setShowSuccessModal(true); // ABRE O MODAL DE PERGUNTA

    } catch (error) {
      console.error(error);
      toast.error('Erro ao processar venda');
    }
  };

  // Função para imprimir (acionada pelo botão do modal)
  const handlePrintReceipt = () => {
    window.print();
    setShowSuccessModal(false);
  };

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

  const filteredItems = sellableItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-100px)] gap-4 animate-fade-in relative">
      
      {/* --- MODAL DE SUCESSO DA VENDA (PERGUNTA SE QUER IMPRIMIR) --- */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
            <div className="mx-auto bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mb-4 text-emerald-600">
              <CheckCircle size={48} />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Venda Realizada!</h2>
            <p className="text-slate-500 mb-8">O pedido foi salvo com sucesso.</p>
            
            <div className="space-y-3">
              <button 
                onClick={handlePrintReceipt}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Printer size={20} /> Imprimir Comprovante
              </button>
              
              <button 
                onClick={() => setShowSuccessModal(false)}
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
        />
      )}

      {/* LADO ESQUERDO: CATÁLOGO */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar (F3)..."
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {loadingCatalog ? (
            <p className="text-center text-slate-400 mt-10">Carregando catálogo...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredItems.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => addToCart(item)}
                  className="bg-white border border-slate-200 p-4 rounded-xl cursor-pointer hover:border-amber-500 hover:shadow-md transition group flex flex-col justify-between h-32 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20">
                     {item.type === 'recipe' ? <ChefHat size={40}/> : <Package size={40}/>}
                  </div>
                  <span className="font-bold text-slate-700 line-clamp-2 relative z-10">{item.name}</span>
                  <div className="text-emerald-600 font-bold text-lg relative z-10">
                    R$ {item.price.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* LADO DIREITO: CAIXA */}
      <div className="w-full md:w-96 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full">
        <div className="p-4 bg-slate-800 text-white rounded-t-xl flex justify-between items-center">
          <div>
            <h3 className="font-bold flex items-center gap-2"><ShoppingCart size={20}/> PDV Aberto</h3>
            <p className="text-xs text-slate-400">Turno iniciado às {new Date(session.opened_at).toLocaleTimeString().slice(0,5)}</p>
          </div>
          <button 
            onClick={() => setShowCloseModal(true)} 
            className="p-2 hover:bg-slate-700 rounded-lg text-rose-300 hover:text-rose-200 transition"
            title="Fechar Caixa"
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
              <ShoppingCart size={48} className="mb-2"/>
              <p>Caixa Livre</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm animate-in slide-in-from-right-2">
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700 line-clamp-1">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.quantity} x R$ {item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-bold text-slate-700">R$ {(item.quantity * item.price).toFixed(2)}</div>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-1">
                    <Trash2 size={16}/>
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

          <div className="grid grid-cols-3 gap-2">
            {['Dinheiro', 'PIX', 'Cartão'].map((method) => (
              <button 
                key={method}
                onClick={() => handleCheckout(method)}
                disabled={cart.length === 0}
                className="flex flex-col items-center gap-1 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                {method === 'Dinheiro' && <Banknote size={24}/>}
                {method === 'PIX' && <QrCode size={24}/>}
                {method === 'Cartão' && <CreditCard size={24}/>}
                <span className="text-xs font-bold uppercase">{method}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* COMPONENTE DE RECIBO (Invisível na tela, visível na impressão) */}
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