import React, { useEffect, useState } from 'react';
import { PosService } from '../services/posService';
import { CashSession } from '../types';
import { Calendar, ArrowLeft, User, AlertCircle, Clock, CheckCircle, ChevronDown, ChevronUp, XCircle, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export function CashHistory() {
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [openSessions, setOpenSessions] = useState<CashSession[]>([]);
  // Estado para sessões expandidas (detalhes/observações)
  const [expandedSessions, setExpandedSessions] = useState<string[]>([]);

  // Estado para modal de confirmação genérico (Aprovar ou Fechar Forçado)
  const [confirmAction, setConfirmAction] = useState<{
    isOpen: boolean;
    type: 'approve' | 'force-close' | null;
    id: string | null;
    data?: any;
  }>({
    isOpen: false, type: null, id: null
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [historyData, openData] = await Promise.all([
        PosService.getSessionHistory(),
        PosService.getAllOpenSessions()
      ]);
      setSessions(historyData);
      setOpenSessions(openData);

      // Auto-expandir sessões com problemas NÃO verificados
      const sessionIdsToExpand = historyData
        .filter(s => {
          const diff = (s.final_balance || 0) - (s.calculated_balance || 0);
          const hasProblem = Math.abs(diff) > 0.01 || !!s.notes;
          return hasProblem && !s.verified_at;
        })
        .map(s => s.id);

      setExpandedSessions(sessionIdsToExpand);

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }

  const toggleSession = (id: string) => {
    setExpandedSessions(prev =>
      prev.includes(id) ? prev.filter(sessionId => sessionId !== id) : [...prev, id]
    );
  };

  const handleConfirmAction = async () => {
    if (!confirmAction.id || !confirmAction.type) return;

    try {
      if (confirmAction.type === 'approve') {
        await PosService.verifySession(confirmAction.id);
        toast.success("Caixa aprovado com sucesso!");
      } else if (confirmAction.type === 'force-close') {
        await PosService.forceCloseSession(confirmAction.id, confirmAction.data?.userId);
        toast.success("Caixa fechado administrativamente!");
      }

      await loadData();
      setConfirmAction({ isOpen: false, type: null, id: null });
    } catch (error: any) {
      console.error("Erro na ação:", error);
      toast.error("Erro: " + (error.message || "Falha na operação"));
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in space-y-8">

      {/* HEADER */}
      <div className="flex items-center gap-4">
        <Link to="/" className="p-2 bg-white rounded-lg border border-slate-200 hover:bg-slate-50 transition">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Histórico de Caixas</h1>
          <p className="text-sm text-slate-500">Consulte fechamentos e monitore caixas abertos.</p>
        </div>
      </div>

      {/* SESSÕES ABERTAS (NOVO) */}
      {openSessions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-amber-800 font-bold flex items-center gap-2 mb-4">
            <AlertCircle size={20} /> Caixas Abertos Agora
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {openSessions.map(session => (
              <div key={session.id} className="bg-white p-4 rounded-lg border border-amber-100 shadow-sm flex flex-col justify-between h-full">
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1">
                    <User size={16} className="text-emerald-500" />
                    <span className="truncate" title={session.user_email}>{session.user_email || 'Usuário Desconhecido'}</span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={12} /> Aberto em: {new Date(session.opened_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-xs font-bold text-amber-600 uppercase bg-amber-100 px-2 py-1 rounded-full">Aberto</span>

                  {/* Botão de Fechamento Forçado (Admin) - VISÍVEL SEM HOVER */}
                  <button
                    onClick={() => setConfirmAction({
                      isOpen: true,
                      type: 'force-close',
                      id: session.id,
                      data: { userId: session.user_id, email: session.user_email }
                    })}
                    className="flex items-center gap-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2 py-1 rounded border border-red-200 transition-colors"
                    title="Forçar o fechamento deste caixa"
                  >
                    <XCircle size={12} />
                    Fechar Agora
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TABELA DE HISTÓRICO */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-bold text-slate-700">Fechamentos Anteriores</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Carregando histórico...</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Nenhum fechamento registrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="p-4 text-sm font-bold text-slate-600">Responsável</th>
                  <th className="p-4 text-sm font-bold text-slate-600">Data Abertura</th>
                  <th className="p-4 text-sm font-bold text-slate-600">Data Fechamento</th>
                  <th className="p-4 text-sm font-bold text-slate-600">Fundo Inicial</th>
                  <th className="p-4 text-sm font-bold text-slate-600">Total Calculado</th>
                  <th className="p-4 text-sm font-bold text-slate-600">Total Informado</th>
                  <th className="p-4 text-sm font-bold text-slate-600">Diferença (Quebra)</th>
                  <th className="p-4 text-sm font-bold text-slate-600 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map(session => {
                  const diff = (session.final_balance || 0) - (session.calculated_balance || 0);
                  const hasDiff = Math.abs(diff) > 0.01;
                  const isVerified = !!session.verified_at;
                  const hasNotes = !!session.notes;
                  const hasContent = hasDiff || hasNotes;
                  const isExpanded = expandedSessions.includes(session.id);

                  return (
                    <React.Fragment key={session.id}>
                      <tr className={`hover: bg - slate - 50 transition group ${hasDiff && !isVerified ? 'bg-amber-50/50' : ''} `}>
                        {/* RESPONSÁVEL */}
                        <td className="p-4 text-sm font-medium text-slate-700">
                          <div className="flex items-center gap-2">
                            <div className={`w - 8 h - 8 rounded - full flex items - center justify - center ${isVerified ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'} `}>
                              <User size={14} />
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <span>{session.user_email?.split('@')[0] || 'Sistema'}</span>
                                {isVerified && <CheckCircle size={12} className="text-emerald-500" title={`Verificado por ${session.verified_by} `} />}
                              </div>
                              <span className="text-[10px] text-slate-400">{session.user_email}</span>
                            </div>
                          </div>
                        </td>

                        {/* DATA ABERTURA */}
                        <td className="p-4 text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-700">
                              {new Date(session.opened_at).toLocaleDateString()}
                            </span>
                            <span className="text-slate-400 text-xs">
                              {new Date(session.opened_at).toLocaleTimeString().slice(0, 5)}
                            </span>
                          </div>
                        </td>

                        {/* DATA FECHAMENTO */}
                        <td className="p-4 text-sm">
                          {session.closed_at ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-slate-700">
                                {new Date(session.closed_at).toLocaleDateString()}
                              </span>
                              <span className="text-slate-400 text-xs">
                                {new Date(session.closed_at).toLocaleTimeString().slice(0, 5)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-emerald-600 font-bold text-xs bg-emerald-100 px-2 py-1 rounded-full">EM ABERTO</span>
                          )}
                        </td>

                        <td className="p-4 text-sm text-slate-500">R$ {session.initial_balance.toFixed(2)}</td>
                        <td className="p-4 text-sm text-slate-500">R$ {session.calculated_balance?.toFixed(2)}</td>
                        <td className="p-4 text-sm font-bold text-slate-700">R$ {session.final_balance?.toFixed(2)}</td>

                        <td className="p-4">
                          <div className={`text - sm font - bold ${diff >= 0 ? 'text-emerald-600' : 'text-red-500'} `}>
                            {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                          </div>
                        </td>

                        {/* TOGGLE BUTTON */}
                        <td className="p-4 text-center">
                          {hasContent && (
                            <button
                              onClick={() => toggleSession(session.id)}
                              className={`p-1 rounded-full transition ${isExpanded ? 'bg-slate-200 text-slate-700' : 'hover:bg-slate-100 text-slate-400'}`}
                            >
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* LINHA DE OBSERVAÇÃO / APROVAÇÃO (EXPANDABLE) */}
                      {hasContent && isExpanded && (
                        <tr className="bg-slate-50/50 border-b border-slate-100 animate-in slide-in-from-top-2">
                          <td colSpan={8} className="px-4 py-3">
                            <div className="flex items-start gap-3 bg-amber-50 p-3 rounded-lg border border-amber-100">
                              <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                              <div className="flex-1">
                                <span className="text-xs font-bold text-amber-700 uppercase block mb-1">Justificativa / Observação</span>
                                <p className="text-sm text-slate-700 italic">"{session.notes || 'Sem justificativa informada'}"</p>

                                {isVerified ? (
                                  <div className="mt-2 text-xs text-emerald-600 flex items-center gap-1 font-bold">
                                    <CheckCircle size={12} /> Aprovado por {session.verified_by} em {new Date(session.verified_at!).toLocaleString()}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmAction({ isOpen: true, type: 'approve', id: session.id })}
                                    className="mt-2 text-xs bg-amber-200 hover:bg-amber-300 text-amber-800 px-3 py-1 rounded-md font-bold transition flex items-center gap-1"
                                  >
                                    <CheckCircle size={12} /> Aprovar / Dar Ciência
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* UNIFIED CONFIRMATION MODAL */}
      {confirmAction.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w - 12 h - 12 rounded - full flex items - center justify - center shrink - 0 ${confirmAction.type === 'force-close' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                }`}>
                {confirmAction.type === 'force-close' ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800">
                  {confirmAction.type === 'force-close' ? 'Forçar Fechamento?' : 'Confirmar Aprovação?'}
                </h3>
                <p className="text-sm text-slate-500 leading-tight mt-1">
                  {confirmAction.type === 'force-close'
                    ? `Deseja fechar o caixa de ${confirmAction.data?.email}? Esta ação é irreversível.`
                    : 'Você está dando ciência na diferença deste caixa.'}
                </p>
              </div>
            </div>

            {/* Warning Extra para Forçar Fechamento */}
            {confirmAction.type === 'force-close' && (
              <div className="bg-red-50 text-red-800 text-xs p-3 rounded mb-4 border border-red-100">
                O caixa será fechado automaticamente com o valor calculado pelo sistema. Certifique-se de que isso é o desejado.
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setConfirmAction({ isOpen: false, type: null, id: null })}
                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                className={`px - 4 py - 2 text - white font - bold rounded - lg transition shadow - lg ${confirmAction.type === 'force-close'
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  }`}
              >
                {confirmAction.type === 'force-close' ? 'Sim, Fechar' : 'Sim, Aprovar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}