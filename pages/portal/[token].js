import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function ClientPortal() {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [contract, setContract] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [posts, setPosts] = useState([]);

  // CONTROLE MENSAL DO CALENDÁRIO DO CLIENTE
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    if (router.isReady && token) {
      fetchPortalData();
    }
  }, [router.isReady, token]);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const { data: cData } = await supabase
        .from('agency_clients')
        .select('*')
        .eq('access_token', token)
        .maybeSingle();

      if (!cData) {
        setLoading(false);
        return;
      }
      setClient(cData);

      const [tRes, contRes, invRes, pRes] = await Promise.all([
        supabase.from('tenants').select('*').eq('id', cData.tenant_id).maybeSingle(),
        supabase.from('agency_contracts').select('*').eq('client_id', cData.id).order('id', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('agency_invoices').select('*').eq('client_id', cData.id).order('due_date', { ascending: true }),
        supabase.from('agency_posts').select('*').eq('client_id', cData.id).order('scheduled_date', { ascending: true })
      ]);

      if (tRes.data) setTenant(tRes.data);
      if (contRes.data) setContract(contRes.data);
      if (invRes.data) setInvoices(invRes.data);
      if (pRes.data) setPosts(pRes.data);
    } catch (e) {
      console.error("Erro ao carregar portal:", e);
    } finally {
      setLoading(false);
    }
  };

  // AÇÃO DE APROVAR OU PEDIR AJUSTE DO POST (100% FUNCIONAL E SINCRONIZADA)
  const handleApprovePost = async (postId, status) => {
    const { error } = await supabase
      .from('agency_posts')
      .update({ status })
      .eq('id', postId);

    if (error) return alert("Erro ao atualizar post: " + error.message);

    setPosts(posts.map(p => p.id === postId ? { ...p, status } : p));
    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost({ ...selectedPost, status });
    }
    alert(status === 'aprovado' ? "Post APROVADO com sucesso! 🎉" : "Solicitação de reajuste enviada! ✏️");
  };

  // NAVEGAÇÃO DE MÊS NO CALENDÁRIO
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  if (loading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans"><p className="text-xs text-gray-400 animate-pulse">Carregando portal do cliente...</p></div>;
  if (!client) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans"><h1 className="text-xl font-bold text-red-500">Portal Inválido ou Expirado</h1></div>;

  const secondaryColor = tenant?.secondary_color || '#090D16';
  const cardBgColor = tenant?.card_bg_color || '#111827';
  const textColor = tenant?.text_color || '#FFFFFF';
  const priceColor = tenant?.price_color || '#FF8C00';

  const pendingInvoices = invoices.filter(i => i.status !== 'pago');

  return (
    <div className="min-h-screen font-sans p-4 sm:p-8 max-w-6xl mx-auto space-y-6 pb-20" style={{ backgroundColor: secondaryColor, color: textColor }}>
      
      {/* BANNER NOTIFICAÇÃO DE FATURA */}
      {pendingInvoices.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 p-4 rounded-3xl flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center space-x-3">
            <span className="text-2xl animate-bounce">🔔</span>
            <div>
              <h3 className="font-bold text-xs text-yellow-400">Você possui {pendingInvoices.length} fatura(s) pendente(s)</h3>
              <p className="text-[11px] opacity-80">Mantenha seu plano em dia para continuar garantindo suas produções.</p>
            </div>
          </div>
          <a href="#faturas" className="bg-yellow-500 text-black font-extrabold text-xs px-4 py-2 rounded-xl">Ver Faturas</a>
        </div>
      )}

      {/* HEADER DO CLIENTE */}
      <header className="flex items-center space-x-4 border border-white/10 p-6 rounded-3xl shadow-xl" style={{ backgroundColor: cardBgColor }}>
        <img 
          src={client.logo_url || tenant?.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80'} 
          alt="Logo" 
          className="w-16 h-16 rounded-2xl object-cover bg-gray-800 border border-white/10 shadow-lg" 
        />
        <div>
          <h1 className="text-xl font-black">{client.name}</h1>
          <p className="text-xs font-bold mt-0.5" style={{ color: priceColor }}>Portal do Cliente • Cronograma & Desempenho</p>
        </div>
      </header>

      {/* DASHBOARD DE MÉTRICAS E ANÁLISE DE CONTA (INSTAGRAM/CAMPANHAS) */}
      <section className="space-y-3">
        <h2 className="text-sm font-extrabold" style={{ color: priceColor }}>📊 Métricas & Desempenho do Mês</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="border border-white/10 p-4 rounded-2xl space-y-1 shadow-lg" style={{ backgroundColor: cardBgColor }}>
            <span className="text-[10px] font-bold opacity-60 block">👀 Alcance Total</span>
            <span className="text-xl font-black text-blue-400">48.200</span>
            <span className="text-[9px] text-green-400 block font-bold">▲ +14% vs mês anterior</span>
          </div>

          <div className="border border-white/10 p-4 rounded-2xl space-y-1 shadow-lg" style={{ backgroundColor: cardBgColor }}>
            <span className="text-[10px] font-bold opacity-60 block">💬 Engajamento</span>
            <span className="text-xl font-black text-purple-400">3.850</span>
            <span className="text-[9px] text-green-400 block font-bold">▲ +8.2% taxa de clique</span>
          </div>

          <div className="border border-white/10 p-4 rounded-2xl space-y-1 shadow-lg" style={{ backgroundColor: cardBgColor }}>
            <span className="text-[10px] font-bold opacity-60 block">👥 Novos Seguidores</span>
            <span className="text-xl font-black text-green-400">+412</span>
            <span className="text-[9px] text-green-400 block font-bold">▲ Crescimento orgânico</span>
          </div>

          <div className="border border-white/10 p-4 rounded-2xl space-y-1 shadow-lg" style={{ backgroundColor: cardBgColor }}>
            <span className="text-[10px] font-bold opacity-60 block">🚀 Impressões Anúncios</span>
            <span className="text-xl font-black text-pink-400">112.500</span>
            <span className="text-[9px] text-blue-400 block font-bold">Meta Ads Ativo</span>
          </div>
        </div>
      </section>

      {/* PACOTE E SERVIÇOS CONTRATADOS */}
      {contract && (
        <section className="border border-white/10 p-6 rounded-3xl space-y-3 shadow-xl" style={{ backgroundColor: cardBgColor }}>
          <h2 className="text-sm font-extrabold" style={{ color: priceColor }}>🎁 Seu Plano & Benefícios Contratados ({contract.contract_name})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {contract.included_services?.split(',').map((serv, i) => (
              <div key={i} className="flex items-center space-x-2 bg-black/30 p-2.5 rounded-xl border border-white/5">
                <span className="text-green-400 font-bold">✓</span>
                <span>{serv.trim()}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* NAVEGADOR DO CALENDÁRIO */}
      <section className="space-y-4">
        <div className="border border-white/10 p-4 rounded-3xl flex justify-between items-center shadow-xl" style={{ backgroundColor: cardBgColor }}>
          <button onClick={handlePrevMonth} className="bg-black/40 hover:bg-black/60 text-xs font-extrabold px-4 py-2 rounded-xl border border-white/10">
            ◀ Anterior
          </button>
          <div className="text-center">
            <span className="text-[10px] uppercase font-bold opacity-60 block">Cronograma de Posts</span>
            <h2 className="text-base font-black" style={{ color: priceColor }}>{monthNames[month]} / {year}</h2>
          </div>
          <button onClick={handleNextMonth} className="bg-black/40 hover:bg-black/60 text-xs font-extrabold px-4 py-2 rounded-xl border border-white/10">
            Próximo ▶
          </button>
        </div>

        {/* CALENDÁRIO MENSAL DO CLIENTE */}
        <div className="border border-white/10 rounded-3xl p-4 shadow-xl overflow-x-auto" style={{ backgroundColor: cardBgColor }}>
          <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-xs mb-2 py-2 border-b border-white/10" style={{ color: priceColor }}>
            <div>DOM</div><div>SEG</div><div>TER</div><div>QUA</div><div>QUI</div><div>SEX</div><div>SÁB</div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-28 bg-black/20 rounded-2xl opacity-20"></div>
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayPosts = posts.filter(p => p.scheduled_date === dayDateStr);

              return (
                <div key={`day-${dayNum}`} className="h-28 bg-black/40 border border-white/5 rounded-2xl p-1.5 space-y-1 overflow-hidden hover:border-white/20 transition">
                  <span className="text-[10px] font-bold opacity-60 block">{dayNum}</span>
                  <div className="space-y-1 overflow-y-auto max-h-20">
                    {dayPosts.map(p => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPost(p)}
                        className={`p-1.5 rounded-xl text-[9px] font-extrabold truncate cursor-pointer transition ${
                          p.status === 'aprovado' ? 'bg-green-600/30 text-green-300 border border-green-500/40' :
                          p.status === 'ajustes_solicitados' ? 'bg-red-600/30 text-red-300 border border-red-500/40' :
                          'bg-yellow-600/30 text-yellow-300 border border-yellow-500/40 animate-pulse'
                        }`}>
                        {p.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* MODAL PARA VER DETALHES, APROVAR OU SOLICITAR REAJUSTE */}
      {selectedPost && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="border border-white/10 w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl" style={{ backgroundColor: cardBgColor }}>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="font-extrabold text-sm" style={{ color: priceColor }}>{selectedPost.title}</h3>
              <button onClick={() => setSelectedPost(null)} className="text-xs font-bold opacity-60 hover:opacity-100">✕ Fechar</button>
            </div>

            <div className="h-56 rounded-2xl overflow-hidden bg-gray-800">
              <img src={selectedPost.media_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&auto=format&fit=crop&q=80'} alt="Arte" className="w-full h-full object-cover" />
            </div>

            <div className="text-xs space-y-2 bg-black/30 p-3.5 rounded-2xl border border-white/5">
              <p>📅 Agendado para: <b>{new Date(selectedPost.scheduled_date + 'T00:00:00').toLocaleDateString('pt-BR')} às {selectedPost.scheduled_time}</b></p>
              <p>📝 Legenda: <span className="opacity-80 block mt-1 leading-relaxed">{selectedPost.copy_text || 'Sem legenda informada.'}</span></p>
              <p>🏷️ Hashtags: <span className="text-blue-400">{selectedPost.hashtags}</span></p>
            </div>

            <div className="flex space-x-3 pt-2">
              <button 
                onClick={() => handleApprovePost(selectedPost.id, 'aprovado')} 
                className="w-1/2 bg-green-600 hover:bg-green-700 text-white font-extrabold py-3 rounded-xl transition shadow-lg text-xs">
                Aprovar Conteúdo 👍
              </button>
              <button 
                onClick={() => handleApprovePost(selectedPost.id, 'ajustes_solicitados')} 
                className="w-1/2 bg-red-600/20 text-red-400 border border-red-500/30 font-extrabold py-3 rounded-xl transition text-xs">
                Solicitar Ajustes ✏️
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO DE FATURAS DO CLIENTE */}
      <section id="faturas" className="space-y-4 pt-4 border-t border-white/10">
        <h2 className="text-base font-extrabold text-green-400">💰 Suas Faturas & Pagamentos</h2>
        <div className="space-y-2.5">
          {invoices.map(inv => (
            <div key={inv.id} className="border border-white/10 p-4 rounded-2xl flex justify-between items-center text-xs shadow-xl" style={{ backgroundColor: cardBgColor }}>
              <div>
                <span className="font-bold text-sm block">Parcela #{inv.installment_number}</span>
                <p className="opacity-60 mt-0.5">Vencimento: {new Date(inv.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-black text-base" style={{ color: priceColor }}>R$ {Number(inv.amount).toFixed(2)}</span>
                <span className={`px-3 py-1 rounded-full font-extrabold uppercase ${inv.status === 'pago' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {inv.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
