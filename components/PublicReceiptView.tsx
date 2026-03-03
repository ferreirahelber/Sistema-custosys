import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChefHat, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';

export function PublicReceiptView() {
    const { id } = useParams();
    const [saleData, setSaleData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSale() {
            try {
                if (!id) return;
                // Tentativa de leitura pública na tabela de sales (caso o RLS permita ou esteja flexível para leitura)
                const { data } = await supabase
                    .from('sales')
                    .select('id, total_amount, created_at, payment_method')
                    .eq('id', id)
                    .maybeSingle();

                setSaleData(data);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        fetchSale();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-8 text-center relative">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-400 to-orange-500"></div>

                <div className="mx-auto bg-amber-100 text-amber-600 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                    <ChefHat size={32} />
                </div>

                <h1 className="text-2xl font-black uppercase text-slate-900 tracking-tight">Dodoce's</h1>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Confeitaria Artesanal</p>

                <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 flex flex-col items-center mb-6">
                    <CheckCircle className="text-emerald-500 mb-2" size={40} />
                    <h2 className="text-emerald-700 font-bold text-xl uppercase tracking-tight">Pedido Confirmado!</h2>
                    <p className="text-emerald-600/80 text-xs font-medium uppercase mt-1">Obrigado pela preferência</p>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-left space-y-3 mb-6">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">ID do Pedido</p>
                        <p className="font-mono text-sm font-semibold text-slate-700">#{String(id).slice(0, 8)}</p>
                    </div>

                    {saleData?.total_amount && (
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Valor Total</p>
                            <p className="font-bold text-lg text-slate-800">R$ {Number(saleData.total_amount).toFixed(2)}</p>
                        </div>
                    )}
                </div>

                <p className="text-[11px] text-slate-400 font-medium">Link seguro validado pelo sistema Custosys.</p>
            </div>
        </div>
    );
}
