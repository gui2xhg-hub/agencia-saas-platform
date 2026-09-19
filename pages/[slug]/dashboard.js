import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function DashboardAgencia() {
  const router = useRouter();
  const { slug } = router.query;

  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [activeTab, setActiveTab] = useState('clientes'); // 'clientes' | 'contratos' | 'financeiro' | 'posts'

  // DATA DE NAVEGAÇÃO DO CALENDÁRIO / CRONOGRAMA
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedClientFilter, setSelectedClientFilter] = useState('ALL'); // FILTRO POR CLIENTE NO CALENDÁRIO

  // DADOS DO BANCO
  const [clients, setClients] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [posts, setPosts] = useState([]);
  const [metrics, setMetrics] = useState([]);

  // MODAIS DE CADASTRO
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', company_name: '', whatsapp: '', email: '', logo_url: '' });

  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] = useState({
    client_id: '',
    contract_name: 'Pack Ouro - Social Media',
    total_monthly_value: 1200,
    duration_months: 6,
    payment_frequency: 'mensal',
    installment_value: 1200,
    start_date: new Date().toISOString().substring(0, 10),
    included_services: '12 Reels / vídeos curtos, 8 Posts estáticos/carrossel, Gestão de Anúncios (Meta Ads), Relatório mensal de performance'
  });

  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ description: '', amount: '', due_date: '', category: 'custo_fixo', recipient_name: '' });

  const [showPostModal, setShowPostModal] = useState(false);
  const [postForm, setPostForm] = useState({
    client_id: '',
    title: '',
    scheduled_date: new Date().toISOString().substring(0, 10),
    scheduled_time: '18:00',
    media_url: '',
    copy_text: '',
    hashtags: '#agencia #socialmedia'
  });

  // MODAL DE CADASTRO DE MÉTRICAS REAIS DO INSTAGRAM
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [metricsForm, setMetricsForm] = useState({
    client_id: '',
    month_year: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
    reach: '48200',
    engagement: '3850',
    followers_gained: '412',
    ad_impressions: '112500',
    growth_percentage: '+14%'
  });

  // MODAL DE BAIXA FINANCEIRA MANUAL
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  // MODAL DE DETALHES DO POST
  const [selectedPostDetail, setSelectedPostDetail] = useState(null);

  useEffect(() => {
    if (router.isReady && slug) {
      fetchAgenciaData();
    }
  }, [router.isReady, slug]);

  const fetchAgenciaData = async () => {
    setLoading(true);
    try {
      const cleanSlug = String(slug).toLowerCase().trim();
      const { data: tData } = await supabase.from('tenants').select('*').eq('slug', cleanSlug).maybeSingle();

      if (!tData) {
        setLoading(false);
        return;
      }
      setTenant(tData);

      const [cRes, contRes, invRes, expRes, pRes, mRes] = await Promise.all([
        supabase.from('agency_clients').select('*').eq('tenant_id', tData.id).order('name'),
        supabase.from('agency_contracts').select('*, agency_clients(name)').eq('tenant_id', tData.id).order('id', { ascending: false }),
        supabase.from('agency_invoices').select('*, agency_clients(name)').eq('tenant_id', tData.id).order('due_date', { ascending: true }),
        supabase.from('agency_expenses').select('*').eq('tenant_id', tData.id).order('due_date', { ascending: true }),
        supabase.from('agency_posts').select('*, agency_clients(name)').eq('tenant_id', tData.id).order('scheduled_date', { ascending: true }),
        supabase.from('agency_metrics').select('*, agency_clients(name)').eq('tenant_id', tData.id).order('month_year', { ascending: false })
      ]);

      if (cRes.data) setClients(cRes.data);
      if (contRes.data) setContracts(contRes.data);
      if (invRes.data) setInvoices(invRes.data);
      if (expRes.data) setExpenses(expRes.data);
      if (pRes.data) setPosts(pRes.data);
      if (mRes.data) setMetrics(mRes.data);

    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setLoading(false);
    }
  };

  // RECALCULAR PARCELA QUANDO MUDAR VALOR MENSAL OU FREQUÊNCIA
  useEffect(() => {
    const monthly = Number(contractForm.total_monthly_value) || 0;
    const freq = contractForm.payment_frequency;
    let div = 1;

    if (freq === 'semanal') div = 4;
    if (freq === 'quinzenal') div = 2;

    setContractForm(prev => ({
      ...prev,
      installment_value: (monthly / div).toFixed(2)
    }));
  }, [contractForm.total_monthly_value, contractForm.payment_frequency]);

  const handleSaveClient = async (e) => {
    e.preventDefault();
    if (!clientForm.name) return alert("Digite o nome do cliente.");

    const token = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);

    const { data, error } = await supabase
      .from('agency_clients')
      .insert([{ ...clientForm, tenant_id: tenant.id, access_token: token }])
      .select()
      .single();

    if (error) return alert("Erro ao salvar cliente: " + error.message);

    setClients([...clients, data]);
    setShowClientModal(false);
    setClientForm({ name: '', company_name: '', whatsapp: '', email: '', logo_url: '' });
  };

  const handleSaveContract = async (e) => {
    e.preventDefault();
    if (!contractForm.client_id) return alert("Selecione um cliente.");

    const totalMonths = Number(contractForm.duration_months);
    const monthlyVal = Number(contractForm.total_monthly_value);
    const instVal = Number(contractForm.installment_value);
    const freq = contractForm.payment_frequency;

    const { data: newContract, error } = await supabase
      .from('agency_contracts')
      .insert([{
        tenant_id: tenant.id,
        client_id: contractForm.client_id,
        contract_name: contractForm.contract_name,
        total_monthly_value: monthlyVal,
        duration_months: totalMonths,
        payment_frequency: freq,
        installment_value: instVal,
        start_date: contractForm.start_date,
        included_services: contractForm.included_services
      }])
      .select()
      .single();

    if (error) return alert("Erro ao criar contrato: " + error.message);

    let generatedInvoices = [];
    let installmentsCount = totalMonths;

    if (freq === 'semanal') installmentsCount = totalMonths * 4;
    if (freq === 'quinzenal') installmentsCount = totalMonths * 2;

    let baseDate = new Date(contractForm.start_date + 'T00:00:00');

    for (let i = 1; i <= installmentsCount; i++) {
      let dueDate = new Date(baseDate);

      if (freq === 'semanal') dueDate.setDate(baseDate.getDate() + (i - 1) * 7);
      else if (freq === 'quinzenal') dueDate.setDate(baseDate.getDate() + (i - 1) * 15);
      else if (freq === 'mensal') dueDate.setMonth(baseDate.getMonth() + (i - 1));

      generatedInvoices.push({
        tenant_id: tenant.id,
        client_id: contractForm.client_id,
        contract_id: newContract.id,
        installment_number: i,
        amount: instVal,
        due_date: dueDate.toISOString().substring(0, 10),
        status: 'pendente'
      });
    }

    await supabase.from('agency_invoices').insert(generatedInvoices);
    fetchAgenciaData();
    setShowContractModal(false);
    alert(`Contrato criado e ${generatedInvoices.length} parcelas geradas com sucesso!`);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('agency_expenses')
      .insert([{ ...expenseForm, tenant_id: tenant.id, amount: Number(expenseForm.amount) }])
      .select()
      .single();

    if (error) return alert("Erro ao salvar despesa: " + error.message);

    setExpenses([...expenses, data]);
    setShowExpenseModal(false);
    setExpenseForm({ description: '', amount: '', due_date: '', category: 'custo_fixo', recipient_name: '' });
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!postForm.client_id || !postForm.title) return alert("Preencha o cliente e o título do post.");

    const { data, error } = await supabase
      .from('agency_posts')
      .insert([{ ...postForm, tenant_id: tenant.id, status: 'aguardando_aprovacao' }])
      .select('*, agency_clients(name)')
      .single();

    if (error) return alert("Erro ao agendar post: " + error.message);

    setPosts([...posts, data]);
    setShowPostModal(false);
    setPostForm({ client_id: '', title: '', scheduled_date: new Date().toISOString().substring(0, 10), scheduled_time: '18:00', media_url: '', copy_text: '', hashtags: '#agencia' });
  };

  const handleSaveMetrics = async (e) => {
    e.preventDefault();
    if (!metricsForm.client_id) return alert("Selecione um cliente.");

    const { data, error } = await supabase
      .from('agency_metrics')
      .insert([{ ...metricsForm, tenant_id: tenant.id }])
      .select('*, agency_clients(name)')
      .single();

    if (error) return alert("Erro ao salvar métricas: " + error.message);

    setMetrics([data, ...metrics]);
    setShowMetricsModal(false);
    alert("Métricas mensais salvas e atualizadas no Portal do Cliente!");
  };

  // BAIXA MANUAL DE FATURA
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const paidVal = Number(paymentAmount);
    if (isNaN(paidVal) || paidVal <= 0) return alert("Digite um valor válido.");

    const { error } = await supabase
      .from('agency_invoices')
      .update({
        status: 'pago',
        amount: paidVal
      })
      .eq('id', selectedInvoice.id);

    if (error) return alert("Erro ao registrar pagamento: " + error.message);

    setInvoices(invoices.map(inv => inv.id === selectedInvoice.id ? { ...inv, status: 'pago', amount: paidVal } : inv));
    setSelectedInvoice(null);
    setPaymentAmount('');
    alert("Pagamento registrado e recalculado no DRE!");
  };

  // DADOS E AÇÕES DE DELETAR (LIMPEZA DO SISTEMA)
  const handleDeleteClient = async (id, name) => {
    if (!confirm(`Deseja apagar o cliente "${name}" e todos os seus dados?`)) return;
    await supabase.from('agency_clients').delete().eq('id', id);
    setClients(clients.filter(c => c.id !== id));
  };

  const handleDeleteContract = async (id) => {
    if (!confirm("Deseja cancelar/excluir este contrato?")) return;
    await supabase.from('agency_contracts').delete().eq('id', id);
    setContracts(contracts.filter(c => c.id !== id));
  };

  const handleDeletePost = async (id) => {
    if (!confirm("Deseja apagar este post?")) return;
    await supabase.from('agency_posts').delete().eq('id', id);
    setPosts(posts.filter(p => p.id !== id));
    if (selectedPostDetail?.id === id) setSelectedPostDetail(null);
  };

  const handleDeleteExpense = async (id) => {
    if (!confirm("Deseja apagar esta despesa?")) return;
    await supabase.from('agency_expenses').delete().eq('id', id);
    setExpenses(expenses.filter(e => e.id !== id));
  };

  // NAVEGAÇÃO DE MÊS
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // POSTS FILTRADOS POR MÊS E CLIENTE
  const filteredPosts = posts.filter(p => {
    if (!p.scheduled_date) return false;
    const d = new Date(p.scheduled_date + 'T00:00:00');
    const matchesMonth = d.getFullYear() === year && d.getMonth() === month;
    const matchesClient = selectedClientFilter === 'ALL' || String(p.client_id) === String(selectedClientFilter);
    return matchesMonth && matchesClient;
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  if (loading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans"><p className="text-xs text-gray-400 animate-pulse">Carregando ERP da Agência...</p></div>;
  if (!tenant) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans"><h1 className="text-xl font-bold text-orange-500">Agência não encontrada</h1></div>;

  const primaryColor = tenant.primary_color || '#FF8C00';
  const buttonTextColor = tenant.button_text_color || '#FFFFFF';
  const secondaryColor = tenant.secondary_color || '#090D16';
  const cardBgColor = tenant.card_bg_color || '#111827';
  const textColor = tenant.text_color || '#FFFFFF';
  const priceColor = tenant.price_color || '#FF8C00';

  // DRE CALCULADO
  const totalReceitasPagas = invoices.filter(i => i.status === 'pago').reduce((a, b) => a + Number(b.amount), 0);
  const totalReceitasPendentes = invoices.filter(i => i.status === 'pendente').reduce((a, b) => a + Number(b.amount), 0);
  const totalDespesas = expenses.reduce((a, b) => a + Number(b.amount), 0);
  const lucroProjetado = (totalReceitasPagas + totalReceitasPendentes) - totalDespesas;

  return (
    <div className="min-h-screen font-sans pb-20 transition-colors" style={{ backgroundColor: secondaryColor, color: textColor }}>
      
      {/* HEADER */}
      <header className="border-b border-white/10 sticky top-0 z-30 backdrop-blur-md bg-opacity-90" style={{ backgroundColor: cardBgColor }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3">
            <img src={tenant.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80'} alt="Logo" className="w-11 h-11 rounded-2xl object-cover bg-gray-800 border border-white/10 shadow-lg" />
            <div>
              <h1 className="font-black text-lg leading-none">{tenant.name}</h1>
              <p className="text-xs font-bold mt-1" style={{ color: priceColor }}>ERP & Gestão de Social Media</p>
            </div>
          </div>

          <div className="flex space-x-2 flex-wrap gap-y-2">
            <button onClick={() => setShowClientModal(true)} className="text-xs font-extrabold px-3.5 py-2.5 rounded-xl transition shadow-md hover:opacity-90" style={{ backgroundColor: primaryColor, color: buttonTextColor }}>+ Novo Cliente</button>
            <button onClick={() => setShowContractModal(true)} className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl transition shadow-md">+ Novo Contrato</button>
            <button onClick={() => setShowPostModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl transition shadow-md">+ Agendar Post</button>
            <button onClick={() => setShowMetricsModal(true)} className="bg-pink-600 hover:bg-pink-700 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl transition shadow-md">+ Lançar Métricas</button>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="max-w-7xl mx-auto px-4 flex space-x-2 border-t border-white/5 pt-2 overflow-x-auto">
          {[
            { id: 'clientes', label: '👥 Clientes & Produção' },
            { id: 'contratos', label: '📄 Contratos & Packs' },
            { id: 'financeiro', label: '💰 Financeiro & DRE' },
            { id: 'posts', label: '📅 Calendário Mensal' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-extrabold rounded-t-xl uppercase tracking-wider transition border-b-2 whitespace-nowrap ${
                activeTab === tab.id ? 'border-current bg-white/5' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
              style={{ color: activeTab === tab.id ? priceColor : textColor }}>
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6">

        {/* NAVEGAÇÃO DE MÊS */}
        <div className="border border-white/10 p-4 rounded-3xl flex justify-between items-center shadow-xl" style={{ backgroundColor: cardBgColor }}>
          <button onClick={handlePrevMonth} className="bg-black/40 hover:bg-black/60 text-xs font-extrabold px-4 py-2 rounded-xl border border-white/10">
            ◀ Mês Anterior
          </button>
          <div className="text-center">
            <span className="text-xs uppercase font-extrabold tracking-widest block opacity-60">Mês do Cronograma</span>
            <h2 className="text-base font-black" style={{ color: priceColor }}>{monthNames[month]} / {year}</h2>
          </div>
          <button onClick={handleNextMonth} className="bg-black/40 hover:bg-black/60 text-xs font-extrabold px-4 py-2 rounded-xl border border-white/10">
            Próximo Mês ▶
          </button>
        </div>

        {/* TAB 1: CLIENTES */}
        {activeTab === 'clientes' && (
          <div className="space-y-6">
            <h2 className="text-sm font-bold opacity-80">Clientes da Agência ({clients.length})</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clients.map(c => {
                const clientMonthPosts = posts.filter(p => {
                  if (p.client_id !== c.id || !p.scheduled_date) return false;
                  const d = new Date(p.scheduled_date + 'T00:00:00');
                  return d.getFullYear() === year && d.getMonth() === month;
                });

                return (
                  <div key={c.id} className="border border-white/10 p-5 rounded-3xl space-y-4 shadow-xl" style={{ backgroundColor: cardBgColor }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <img src={c.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'} alt={c.name} className="w-12 h-12 rounded-2xl object-cover bg-gray-800 border border-white/10" />
                        <div>
                          <h3 className="font-extrabold text-sm">{c.name}</h3>
                          <p className="text-xs opacity-60">{c.company_name || 'Sem Razão Social'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            const link = `${window.location.origin}/portal/${c.access_token}`;
                            navigator.clipboard.writeText(link);
                            alert("Link do Portal do Cliente copiado!");
                          }}
                          className="text-[11px] font-bold px-3 py-1.5 rounded-xl border border-white/10 hover:bg-white/5 transition"
                          style={{ color: priceColor }}>
                          🔗 Copiar Portal
                        </button>
                        <button onClick={() => handleDeleteClient(c.id, c.name)} className="text-red-400 bg-red-500/10 hover:bg-red-500/20 p-1.5 rounded-xl border border-red-500/20 text-xs">
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* CRONOGRAMA DO MÊS */}
                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 space-y-2">
                      <div className="flex justify-between items-center text-xs border-b border-white/10 pb-2">
                        <span className="font-bold opacity-80">📌 Conteúdos de {monthNames[month]}</span>
                        <span className="font-black text-xs" style={{ color: priceColor }}>{clientMonthPosts.length} Posts</span>
                      </div>

                      {clientMonthPosts.length === 0 ? (
                        <p className="text-xs opacity-40 text-center py-4">Nenhum post agendado neste mês.</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pt-1">
                          {clientMonthPosts.map(p => (
                            <div key={p.id} className="bg-gray-900/80 p-2.5 rounded-xl flex justify-between items-center text-xs border border-white/5">
                              <span className="font-bold truncate max-w-[180px]">{p.title}</span>
                              <div className="flex items-center space-x-2">
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${p.status === 'aprovado' ? 'bg-green-500/20 text-green-400' : p.status === 'ajustes_solicitados' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                  {p.status.replace('_', ' ')}
                                </span>
                                <button onClick={() => handleDeletePost(p.id)} className="text-red-400 hover:text-red-300 text-[10px]">✕</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: CONTRATOS */}
        {activeTab === 'contratos' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold opacity-80">Contratos Ativos</h2>
            <div className="space-y-4">
              {contracts.map(cont => (
                <div key={cont.id} className="border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl" style={{ backgroundColor: cardBgColor }}>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/10 pb-3">
                    <div>
                      <span className="text-xs font-black uppercase tracking-wider block" style={{ color: priceColor }}>{cont.agency_clients?.name}</span>
                      <h3 className="font-extrabold text-lg mt-0.5">{cont.contract_name}</h3>
                      <p className="text-xs opacity-60 mt-1">
                        Duração: {cont.duration_months} meses • Cobrança: <b className="uppercase">{cont.payment_frequency}</b> (R$ {cont.installment_value}/parcela)
                      </p>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <span className="text-xs opacity-60 block">Valor Mensal</span>
                        <span className="text-xl font-black text-green-400">R$ {Number(cont.total_monthly_value).toFixed(2)}</span>
                      </div>
                      <button onClick={() => handleDeleteContract(cont.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-xl border border-red-500/20 text-xs">
                        🗑️
                      </button>
                    </div>
                  </div>

                  <div className="bg-black/30 border border-white/5 p-4 rounded-2xl space-y-2">
                    <span className="text-xs font-bold opacity-80 block">🎁 Entregáveis / Serviços Inclusos no Pack:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {cont.included_services?.split(',').map((serv, idx) => (
                        <div key={idx} className="flex items-center space-x-2 bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="text-green-400 font-bold">✓</span>
                          <span>{serv.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: FINANCEIRO */}
        {activeTab === 'financeiro' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="border border-white/10 p-5 rounded-3xl space-y-1 shadow-xl" style={{ backgroundColor: cardBgColor }}>
                <span className="text-xs font-bold opacity-60 block">🟢 Recebido (Pago)</span>
                <span className="text-2xl font-black text-green-400">R$ {totalReceitasPagas.toFixed(2)}</span>
              </div>
              <div className="border border-white/10 p-5 rounded-3xl space-y-1 shadow-xl" style={{ backgroundColor: cardBgColor }}>
                <span className="text-xs font-bold opacity-60 block">🟡 A Receber (Pendente)</span>
                <span className="text-2xl font-black text-yellow-400">R$ {totalReceitasPendentes.toFixed(2)}</span>
              </div>
              <div className="border border-white/10 p-5 rounded-3xl space-y-1 shadow-xl" style={{ backgroundColor: cardBgColor }}>
                <span className="text-xs font-bold opacity-60 block">🔴 Contas a Pagar</span>
                <span className="text-2xl font-black text-red-400">R$ {totalDespesas.toFixed(2)}</span>
              </div>
              <div className="border border-white/10 p-5 rounded-3xl space-y-1 shadow-xl" style={{ backgroundColor: cardBgColor }}>
                <span className="text-xs font-bold opacity-60 block">🚀 Lucro Estimado</span>
                <span className={`text-2xl font-black ${lucroProjetado >= 0 ? 'text-blue-400' : 'text-red-500'}`}>R$ {lucroProjetado.toFixed(2)}</span>
              </div>
            </div>

            <div className="border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl" style={{ backgroundColor: cardBgColor }}>
              <h3 className="font-extrabold text-sm">Faturas de Clientes</h3>
              <div className="space-y-2.5 max-h-96 overflow-y-auto">
                {invoices.map(inv => (
                  <div key={inv.id} className="bg-black/30 border border-white/5 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-extrabold block" style={{ color: priceColor }}>{inv.agency_clients?.name}</span>
                      <p className="opacity-60 mt-0.5">Vencimento: {new Date(inv.due_date + 'T00:00:00').toLocaleDateString('pt-BR')} • Parcela #{inv.installment_number}</p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="font-black text-sm">R$ {Number(inv.amount).toFixed(2)}</span>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${inv.status === 'pago' ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
                        {inv.status.toUpperCase()}
                      </span>

                      {inv.status !== 'pago' && (
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setPaymentAmount(inv.amount);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-3 py-1.5 rounded-xl text-[10px] transition">
                          💵 Dar Baixa
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CALENDÁRIO COM FILTRO DE CLIENTE */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border border-white/10 p-4 rounded-3xl" style={{ backgroundColor: cardBgColor }}>
              <h2 className="text-sm font-bold opacity-80">Calendário de Conteúdos - {monthNames[month]} / {year}</h2>

              {/* FILTRO DE CLIENTE NO CALENDÁRIO */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <span className="text-xs font-bold opacity-60 whitespace-nowrap">Filtrar Cliente:</span>
                <select
                  value={selectedClientFilter}
                  onChange={e => setSelectedClientFilter(e.target.value)}
                  className="bg-black/50 border border-white/10 p-2 rounded-xl text-xs text-white font-bold focus:outline-none w-full sm:w-56">
                  <option value="ALL">👥 Todos os Clientes</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

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
                  const dayPosts = filteredPosts.filter(p => p.scheduled_date === dayDateStr);

                  return (
                    <div key={`day-${dayNum}`} className="h-28 bg-black/40 border border-white/5 rounded-2xl p-1.5 space-y-1 overflow-hidden hover:border-white/20 transition">
                      <span className="text-[10px] font-bold opacity-60 block">{dayNum}</span>
                      <div className="space-y-1 overflow-y-auto max-h-20">
                        {dayPosts.map(p => (
                          <div
                            key={p.id}
                            onClick={() => setSelectedPostDetail(p)}
                            className={`p-1.5 rounded-lg text-[9px] font-bold truncate cursor-pointer transition ${
                              p.status === 'aprovado' ? 'bg-green-600/30 text-green-300 border border-green-500/40' :
                              p.status === 'ajustes_solicitados' ? 'bg-red-600/30 text-red-300 border border-red-500/40' :
                              'bg-yellow-600/30 text-yellow-300 border border-yellow-500/40'
                            }`}>
                            <span className="opacity-70 font-mono block text-[8px]">{p.agency_clients?.name}</span>
                            {p.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL NOVO CONTRATO COMPLETO */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveContract} className="border border-white/10 w-full max-w-md rounded-3xl p-6 space-y-3 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ backgroundColor: cardBgColor }}>
            <h3 className="font-extrabold text-sm text-purple-400">Novo Contrato e Gerador de Faturas</h3>
            
            <div>
              <label className="text-[10px] opacity-60 block mb-1">Cliente:</label>
              <select required value={contractForm.client_id} onChange={e => setContractForm({ ...contractForm, client_id: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white font-bold">
                <option value="">Selecione o Cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <input type="text" required placeholder="Nome do Pacote (ex: Pack Ouro)" value={contractForm.contract_name} onChange={e => setContractForm({ ...contractForm, contract_name: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
            
            <textarea placeholder="Serviços inclusos (separados por vírgula)" rows={2} value={contractForm.included_services} onChange={e => setContractForm({ ...contractForm, included_services: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] opacity-60 block mb-1">Valor Mensal (R$):</label>
                <input type="number" required value={contractForm.total_monthly_value} onChange={e => setContractForm({ ...contractForm, total_monthly_value: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white font-bold" />
              </div>
              <div>
                <label className="text-[10px] opacity-60 block mb-1">Duração (Meses):</label>
                <input type="number" required value={contractForm.duration_months} onChange={e => setContractForm({ ...contractForm, duration_months: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] opacity-60 block mb-1">Frequência Pagamento:</label>
                <select value={contractForm.payment_frequency} onChange={e => setContractForm({ ...contractForm, payment_frequency: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white font-bold">
                  <option value="mensal">Mensal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="semanal">Semanal</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] opacity-60 block mb-1">Valor por Parcela (R$):</label>
                <input type="number" required value={contractForm.installment_value} onChange={e => setContractForm({ ...contractForm, installment_value: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-green-400 font-bold" />
              </div>
            </div>

            <div>
              <label className="text-[10px] opacity-60 block mb-1">Data 1ª Parcela / Início:</label>
              <input type="date" required value={contractForm.start_date} onChange={e => setContractForm({ ...contractForm, start_date: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
            </div>

            <div className="flex space-x-2 pt-2">
              <button type="button" onClick={() => setShowContractModal(false)} className="w-1/2 bg-gray-800 text-xs font-bold py-3 rounded-xl">Cancelar</button>
              <button type="submit" className="w-1/2 bg-purple-600 text-xs font-extrabold py-3 rounded-xl shadow-lg">Gerar Contrato</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL LANÇAR MÉTRICAS DO INSTAGRAM DO MÊS */}
      {showMetricsModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveMetrics} className="border border-white/10 w-full max-w-md rounded-3xl p-6 space-y-3 shadow-2xl" style={{ backgroundColor: cardBgColor }}>
            <h3 className="font-extrabold text-sm text-pink-400">📊 Lançar Relatório Mensal para o Cliente</h3>
            
            <select required value={metricsForm.client_id} onChange={e => setMetricsForm({ ...metricsForm, client_id: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white font-bold">
              <option value="">Selecione o Cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] opacity-60 block mb-1">Mês/Ano:</label>
                <input type="month" required value={metricsForm.month_year} onChange={e => setMetricsForm({ ...metricsForm, month_year: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
              </div>
              <div>
                <label className="text-[10px] opacity-60 block mb-1">Crescimento (%):</label>
                <input type="text" placeholder="+14%" value={metricsForm.growth_percentage} onChange={e => setMetricsForm({ ...metricsForm, growth_percentage: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-green-400 font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] opacity-60 block mb-1">Alcance Total:</label>
                <input type="text" placeholder="48.200" value={metricsForm.reach} onChange={e => setMetricsForm({ ...metricsForm, reach: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
              </div>
              <div>
                <label className="text-[10px] opacity-60 block mb-1">Engajamento:</label>
                <input type="text" placeholder="3.850" value={metricsForm.engagement} onChange={e => setMetricsForm({ ...metricsForm, engagement: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] opacity-60 block mb-1">Novos Seguidores:</label>
                <input type="text" placeholder="+412" value={metricsForm.followers_gained} onChange={e => setMetricsForm({ ...metricsForm, followers_gained: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
              </div>
              <div>
                <label className="text-[10px] opacity-60 block mb-1">Impressões Anúncios:</label>
                <input type="text" placeholder="112.500" value={metricsForm.ad_impressions} onChange={e => setMetricsForm({ ...metricsForm, ad_impressions: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button type="button" onClick={() => setShowMetricsModal(false)} className="w-1/2 bg-gray-800 text-xs font-bold py-3 rounded-xl">Cancelar</button>
              <button type="submit" className="w-1/2 bg-pink-600 text-xs font-extrabold py-3 rounded-xl shadow-lg">Salvar Métricas</button>
            </div>
          </form>
        </div>
      )}

      {/* DEMAIS MODAIS (CLIENTE, POST, DESPESA, DETALHES, BAIXA) */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveClient} className="border border-white/10 w-full max-w-md rounded-3xl p-6 space-y-3 shadow-2xl" style={{ backgroundColor: cardBgColor }}>
            <h3 className="font-extrabold text-sm" style={{ color: priceColor }}>Cadastrar Novo Cliente</h3>
            <input type="text" required placeholder="Nome do Cliente" value={clientForm.name} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white focus:outline-none" />
            <input type="text" placeholder="Razão Social / Empresa" value={clientForm.company_name} onChange={e => setClientForm({ ...clientForm, company_name: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white focus:outline-none" />
            <input type="text" placeholder="WhatsApp (DDD + Número)" value={clientForm.whatsapp} onChange={e => setClientForm({ ...clientForm, whatsapp: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white focus:outline-none" />
            <input type="email" placeholder="Email" value={clientForm.email} onChange={e => setClientForm({ ...clientForm, email: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white focus:outline-none" />
            <input type="url" placeholder="URL da Logo (Opcional)" value={clientForm.logo_url} onChange={e => setClientForm({ ...clientForm, logo_url: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white focus:outline-none" />
            <div className="flex space-x-2 pt-2">
              <button type="button" onClick={() => setShowClientModal(false)} className="w-1/2 bg-gray-800 text-xs font-bold py-3 rounded-xl">Cancelar</button>
              <button type="submit" className="w-1/2 text-xs font-extrabold py-3 rounded-xl shadow-lg" style={{ backgroundColor: primaryColor, color: buttonTextColor }}>Salvar Cliente</button>
            </div>
          </form>
        </div>
      )}

      {showPostModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSavePost} className="border border-white/10 w-full max-w-md rounded-3xl p-6 space-y-3 shadow-2xl" style={{ backgroundColor: cardBgColor }}>
            <h3 className="font-extrabold text-sm text-blue-400">Agendar Novo Conteúdo</h3>
            <select required value={postForm.client_id} onChange={e => setPostForm({ ...postForm, client_id: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white font-bold">
              <option value="">Selecione o Cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="text" required placeholder="Título do Post / Tema" value={postForm.title} onChange={e => setPostForm({ ...postForm, title: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
            <input type="url" placeholder="URL da Mídia (Canva, Drive)" value={postForm.media_url} onChange={e => setPostForm({ ...postForm, media_url: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
            <textarea placeholder="Texto da Legenda / Copy" rows={3} value={postForm.copy_text} onChange={e => setPostForm({ ...postForm, copy_text: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" required value={postForm.scheduled_date} onChange={e => setPostForm({ ...postForm, scheduled_date: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
              <input type="time" required value={postForm.scheduled_time} onChange={e => setPostForm({ ...postForm, scheduled_time: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
            </div>
            <div className="flex space-x-2 pt-2">
              <button type="button" onClick={() => setShowPostModal(false)} className="w-1/2 bg-gray-800 text-xs font-bold py-3 rounded-xl">Cancelar</button>
              <button type="submit" className="w-1/2 bg-blue-600 text-xs font-extrabold py-3 rounded-xl shadow-lg">Agendar Post</button>
            </div>
          </form>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleConfirmPayment} className="border border-white/10 w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl" style={{ backgroundColor: cardBgColor }}>
            <h3 className="font-extrabold text-sm text-green-400">💵 Confirmar Pagamento Manual</h3>
            <p className="text-xs opacity-80">Cliente: <b>{selectedInvoice.agency_clients?.name}</b></p>
            <div>
              <label className="text-[10px] opacity-60 block mb-1">Valor Pago (R$):</label>
              <input
                type="number"
                step="0.01"
                required
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-sm font-bold text-green-400 focus:outline-none"
              />
            </div>
            <div className="flex space-x-2">
              <button type="button" onClick={() => setSelectedInvoice(null)} className="w-1/2 bg-gray-800 text-xs font-bold py-3 rounded-xl">Cancelar</button>
              <button type="submit" className="w-1/2 bg-green-600 hover:bg-green-700 text-white text-xs font-extrabold py-3 rounded-xl shadow-lg">Confirmar Baixa</button>
            </div>
          </form>
        </div>
      )}

      {selectedPostDetail && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="border border-white/10 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl" style={{ backgroundColor: cardBgColor }}>
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <h3 className="font-extrabold text-sm" style={{ color: priceColor }}>{selectedPostDetail.title}</h3>
              <div className="flex items-center space-x-2">
                <button onClick={() => handleDeletePost(selectedPostDetail.id)} className="bg-red-500/20 text-red-400 text-xs font-bold px-2.5 py-1 rounded-lg">Deletar Post 🗑️</button>
                <button onClick={() => setSelectedPostDetail(null)} className="text-xs font-bold opacity-60 hover:opacity-100">✕ Fechar</button>
              </div>
            </div>
            <div className="h-48 rounded-2xl overflow-hidden bg-gray-800">
              <img src={selectedPostDetail.media_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&auto=format&fit=crop&q=80'} alt="Mídia" className="w-full h-full object-cover" />
            </div>
            <div className="text-xs space-y-2 bg-black/30 p-3 rounded-2xl border border-white/5">
              <p>👤 Cliente: <b>{selectedPostDetail.agency_clients?.name}</b></p>
              <p>📅 Data: <b>{new Date(selectedPostDetail.scheduled_date + 'T00:00:00').toLocaleDateString('pt-BR')} às {selectedPostDetail.scheduled_time}</b></p>
              <p>📝 Legenda: <span className="opacity-80 block mt-1">{selectedPostDetail.copy_text || 'Sem legenda cadastrada.'}</span></p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
