import React, { useState } from 'react';
import { ShoppingCart, Trash2, CreditCard, Banknote, QrCode, History, LogOut, ReceiptText, ChevronDown, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CartItem, CashSession } from '../types';

interface CartPanelProps {
    cart: CartItem[];
    session: CashSession | null;
    onRemoveItem: (id: string) => void;
    onCheckout: (method: string) => void;
    onOpenCloseSession: () => void;
    onShowConference: () => void;
    showConference: boolean;
    setShowConference: (show: boolean) => void;
    sessionSummary: any;
    isMobile?: boolean; // New prop to handle mobile specific UI (like Close button)
    onCloseMobile?: () => void;
}

export function CartPanel({
    cart,
    session,
    onRemoveItem,
    onCheckout,
    onOpenCloseSession,
    onShowConference,
    showConference,
    setShowConference,
    sessionSummary,
    isMobile = false,
    onCloseMobile
}: CartPanelProps) {
    const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    return (
        <div className="flex flex-col h-full bg-white md:rounded-xl shadow-sm border border-slate-200">
            <div className="p-4 bg-slate-800 text-white md:rounded-t-xl flex justify-between items-center">
                <div>
                    <h3 className="font-bold flex items-center gap-2">
                        <ShoppingCart size={20} />
                        {isMobile ? 'Seu Carrinho' : 'PDV Aberto'}
                    </h3>
                    <p className="text-xs text-slate-400">Session ID: {session?.id.slice(0, 8)}...</p>
                </div>

                <div className="flex gap-2 items-center">
                    {/* Mobile Close Button */}
                    {isMobile && onCloseMobile && (
                        <button onClick={onCloseMobile} className="p-2 bg-slate-700/50 rounded-full text-white mx-2">
                            <X size={20} />
                        </button>
                    )}

                    {!isMobile && (
                        <>
                            <button
                                onClick={onShowConference}
                                className="p-2 hover:bg-slate-700 rounded-lg text-emerald-300 hover:text-emerald-200 transition"
                                title="Conferência Rápida"
                            >
                                <ReceiptText size={20} />
                            </button>

                            <Link to="/cash-history" className="p-2 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition" title="Histórico">
                                <History size={20} />
                            </Link>

                            <button
                                onClick={onOpenCloseSession}
                                className="p-2 hover:bg-slate-700 rounded-lg text-rose-300 hover:text-rose-200 transition"
                                title="Fechar Caixa"
                            >
                                <LogOut size={20} />
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ÁREA DE CONFERÊNCIA RÁPIDA (EXPANSÍVEL) */}
            {showConference && sessionSummary && (
                <div className="bg-slate-100 p-3 border-b border-slate-200 animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase">Resumo Parcial</span>
                        <button onClick={() => setShowConference(false)} className="text-xs text-slate-400 hover:text-slate-600">Fechar</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="block text-slate-400">Dinheiro</span>
                            <span className="font-bold text-slate-700">R$ {sessionSummary.money.toFixed(2)}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="block text-slate-400">Cartão</span>
                            <span className="font-bold text-slate-700">R$ {(sessionSummary.credit + sessionSummary.debit).toFixed(2)}</span>
                        </div>
                        <div className="bg-white p-2 rounded border border-slate-200">
                            <span className="block text-slate-400">PIX</span>
                            <span className="font-bold text-slate-700">R$ {sessionSummary.pix.toFixed(2)}</span>
                        </div>
                        <div className="bg-emerald-50 p-2 rounded border border-emerald-200">
                            <span className="block text-emerald-600">Total</span>
                            <span className="font-bold text-emerald-700">R$ {sessionSummary.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}

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
                                <button onClick={() => onRemoveItem(item.id)} className="text-red-400 hover:text-red-600 p-1">
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
                        onClick={() => onCheckout('Dinheiro')}
                        disabled={cart.length === 0}
                        className="flex flex-col items-center gap-1 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition disabled:opacity-50 active:scale-95"
                    >
                        <Banknote size={24} />
                        <span className="text-xs font-bold uppercase">Dinheiro</span>
                    </button>
                    <button
                        onClick={() => onCheckout('PIX')}
                        disabled={cart.length === 0}
                        className="flex flex-col items-center gap-1 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-700 transition disabled:opacity-50 active:scale-95"
                    >
                        <QrCode size={24} />
                        <span className="text-xs font-bold uppercase">PIX</span>
                    </button>
                    <button
                        onClick={() => onCheckout('Débito')}
                        disabled={cart.length === 0}
                        className="flex flex-col items-center gap-1 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-sky-500 hover:bg-sky-50 hover:text-sky-700 transition disabled:opacity-50 active:scale-95"
                    >
                        <CreditCard size={24} />
                        <span className="text-xs font-bold uppercase">Débito</span>
                    </button>
                    <button
                        onClick={() => onCheckout('Crédito')}
                        disabled={cart.length === 0}
                        className="flex flex-col items-center gap-1 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 hover:text-orange-700 transition disabled:opacity-50 active:scale-95"
                    >
                        <CreditCard size={24} />
                        <span className="text-xs font-bold uppercase">Crédito</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
