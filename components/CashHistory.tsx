import React, { useEffect, useState } from 'react';
import { PosService } from '../services/posService';
import { CashSession } from '../types';
import { Calendar, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CashHistory() {
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const data = await PosService.getSessionHistory();
      setSessions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/" className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition">
          <ArrowLeft size={20} className="text-slate-600"/>
        </Link>
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Histórico de Caixas</h1>
            <p className="text-sm text-slate-500">Consulte os fechamentos anteriores.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando histórico...</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Nenhum fechamento registrado.</div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="p-4 text-sm font-bold text-slate-600">Data Abertura</th>
                <th className="p-4 text-sm font-bold text-slate-600">Data Fechamento</th>
                <th className="p-4 text-sm font-bold text-slate-600">Fundo Inicial</th>
                <th className="p-4 text-sm font-bold text-slate-600">Esperado (Total)</th>
                <th className="p-4 text-sm font-bold text-slate-600">Conferido (Total)</th>
                <th className="p-4 text-sm font-bold text-slate-600">Diferença</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map(session => {
                const diff = (session.final_balance || 0) - (session.calculated_balance || 0);
                return (
                  <tr key={session.id} className="hover:bg-slate-50 transition">
                    {/* DATA ABERTURA */}
                    <td className="p-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-emerald-500"/>
                        <span className="font-medium">
                            {new Date(session.opened_at).toLocaleDateString()}
                        </span>
                        <span className="text-slate-400 text-xs">
                            {new Date(session.opened_at).toLocaleTimeString().slice(0,5)}
                        </span>
                      </div>
                    </td>

                    {/* DATA FECHAMENTO (CORRIGIDO) */}
                    <td className="p-4 text-sm">
                      {session.closed_at ? (
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-rose-400"/>
                            <span className="font-medium">
                                {new Date(session.closed_at).toLocaleDateString()}
                            </span>
                            <span className="text-slate-400 text-xs">
                                {new Date(session.closed_at).toLocaleTimeString().slice(0,5)}
                            </span>
                        </div>
                      ) : (
                        <span className="text-emerald-600 font-bold text-xs bg-emerald-100 px-2 py-1 rounded-full">ABERTO</span>
                      )}
                    </td>

                    <td className="p-4 text-sm text-slate-500">R$ {session.initial_balance.toFixed(2)}</td>
                    <td className="p-4 text-sm text-slate-500">R$ {session.calculated_balance?.toFixed(2)}</td>
                    <td className="p-4 text-sm font-bold text-slate-700">R$ {session.final_balance?.toFixed(2)}</td>
                    
                    <td className={`p-4 text-sm font-bold ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}