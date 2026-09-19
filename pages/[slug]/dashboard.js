import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function DashboardAgencia() {
  const router = useRouter();
  const { slug } = router.query;

  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [activeTab, setActiveTab] = useState('clientes'); // 'clientes' | 'contratos' | 'financeiro' | 'posts'

  // DADOS DO BANCO
  const [clients, setClients] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [posts, setPosts] = useState([]);

  // MODAIS
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', company_name: '', whatsapp: '', email: '', logo_url: '' });

  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] = useState({
    client_id: '',
    contract_name: 'Pack Padrão - Social Media',
    total_monthly_value: 800,
    duration_months: 3,
    payment_frequency: 'semanal',
    installment_value: 200,
    start_date: new Date().toISOString().substring(0, 10)
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

      const [cRes, contRes, invRes, expRes, pRes] = await Promise.all([
        supabase.from('agency_clients').select('*').eq('tenant_id', tData.id).order('name'),
        supabase.from('agency_contracts').select('*, agency_clients(name)').eq('tenant_id', tData.id).order('id', { ascending: false }),
        supabase.from('agency_invoices').select('*, agency_clients(name)').eq('tenant_id', tData.id).order('due_date', { ascending: true }),
        supabase.from('agency_expenses').select('*').eq('tenant_id', tData.id).order('due_date', { ascending: true }),
        supabase.from('agency_posts').select('*, agency_clients(name)').eq('tenant_id', tData.id).order('scheduled_date', { ascending: true })
      ]);

      if (cRes.data) setClients(cRes.data);
      if (contRes.data) setContracts(contRes.data);
      if (invRes.data) setInvoices(invRes.data);
      if (expRes.data) setExpenses(expRes.data);
      if (pRes.data) setPosts(pRes.data);

    } catch (e) {
      console.error("Erro ao carregar dados da agência:", e);
    } finally {
      setLoading(false);
    }
  };

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
        start_date: contractForm.start_date
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
    alert(`Contrato criado e ${generatedInvoices.length} parcelas geradas!`);
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

  const sendWhatsAppReminder = (invoice) => {
    const clientData = clients.find(c => c.id === invoice.client_id);
    const cleanPhone = clientData?.whatsapp ? clientData.whatsapp.replace(/\D/g, '') : '';
    if (!cleanPhone) return alert("Cliente não possui número de WhatsApp cadastrado.");

    const portalUrl = `${window.location.origin}/portal/${clientData.access_token}`;
    const msg = `Olá *${clientData.name}*! Lembrete da fatura com vencimento em *${new Date(invoice.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}* no valor de *R$ ${Number(invoice.amount).toFixed(2)}*.\n\nAcesse seu portal para visualizar e pagar via PIX:\n👉 ${portalUrl}`;

    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (loading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans"><p className="text-xs text-gray-400 animate-pulse">Carregando ERP da Agência...</p></div>;
  if (!tenant) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans"><h1 className="text-xl font-bold text-orange-500">Agência não encontrada</h1></div>;

  // CORES DINÂMICAS VINDAS DO MASTER
  const primaryColor = tenant.primary_color || '#FF8C00';
  const buttonTextColor = tenant.button_text_color || '#FFFFFF';
  const secondaryColor = tenant.secondary_color || '#090D16';
  const cardBgColor = tenant.card_bg_color || '#111827';
  const textColor = tenant.text_color || '#FFFFFF';
  const priceColor = tenant.price_color || '#FF8C00';

  // DRE / FINANCEIRO
  const totalReceitasPagas = invoices.filter(i => i.status === 'pago').reduce((a, b) => a + Number(b.amount), 0);
  const totalReceitasPendentes = invoices.filter(i => i.status === 'pendente').reduce((a, b) => a + Number(b.amount), 0);
  const totalDespesas = expenses.reduce((a, b) => a + Number(b.amount), 0);
  const lucroProjetado = (totalReceitasPagas + totalReceitasPendentes) - totalDespesas;

  return (
    <div className="min-h-screen font-sans pb-20 transition-colors" style={{ backgroundColor: secondaryColor, color: textColor }}>
      
      {/* HEADER DINÂMICO */}
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
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="max-w-7xl mx-auto px-4 flex space-x-2 border-t border-white/5 pt-2 overflow-x-auto">
          {[
            { id: 'clientes', label: '👥 Clientes' },
            { id: 'contratos', label: '📄 Contratos' },
            { id: 'financeiro', label: '💰 Financeiro & DRE' },
            { id: 'posts', label: '📅 Calendário de Posts' }
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

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6">

        {/* TAB 1: CLIENTES */}
        {activeTab === 'clientes' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-bold opacity-80">Clientes da Agência ({clients.length})</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {clients.map(c => (
                <div key={c.id} className="border border-white/10 p-5 rounded-3xl space-y-4 shadow-xl transition hover:border-white/20" style={{ backgroundColor: cardBgColor }}>
                  <div className="flex items-center space-x-3">
                    <img src={c.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80'} alt={c.name} className="w-12 h-12 rounded-2xl object-cover bg-gray-800 border border-white/10" />
                    <div className="overflow-hidden">
                      <h3 className="font-extrabold text-sm truncate">{c.name}</h3>
                      <p className="text-xs opacity-60 truncate">{c.company_name || 'Sem Razão Social'}</p>
                    </div>
                  </div>

                  <div className="text-xs opacity-80 space-y-1.5 bg-black/40 p-3 rounded-2xl border border-white/5 font-mono">
                    <p>💬 Zap: <b style={{ color: priceColor }}>{c.whatsapp || 'Não informado'}</b></p>
                    <p>📧 Email: <b>{c.email || 'Não informado'}</b></p>
                  </div>

                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/portal/${c.access_token}`;
                      navigator.clipboard.writeText(link);
                      alert("Link único do Portal do Cliente copiado!");
                    }}
                    className="w-full text-xs font-bold py-2.5 rounded-xl transition border border-white/10 hover:bg-white/5"
                    style={{ color: priceColor }}>
                    🔗 Copiar Link do Portal
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: CONTRATOS */}
        {activeTab === 'contratos' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold opacity-80">Contratos Ativos</h2>
            <div className="space-y-3">
              {contracts.map(cont => (
                <div key={cont.id} className="border border-white/10 p-5 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl" style={{ backgroundColor: cardBgColor }}>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block" style={{ color: priceColor }}>{cont.agency_clients?.name}</span>
                    <h3 className="font-extrabold text-base mt-0.5">{cont.contract_name}</h3>
                    <p className="text-xs opacity-60 mt-1">
                      Início: {new Date(cont.start_date + 'T00:00:00').toLocaleDateString('pt-BR')} • Duração: {cont.duration_months}m • Frequência: <b className="uppercase">{cont.payment_frequency}</b>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs opacity-60 block">Valor da Parcela</span>
                    <span className="text-xl font-black text-green-400">R$ {Number(cont.installment_value).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: FINANCEIRO & DRE */}
        {activeTab === 'financeiro' && (
          <div className="space-y-6">
            
            {/* CARDS RESUMO DRE */}
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

            {/* TABELA DE FATURAS */}
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
                        <button onClick={() => sendWhatsAppReminder(inv)} className="bg-green-600 hover:bg-green-700 text-white font-bold px-3 py-1.5 rounded-xl text-[10px] transition">
                          💬 Cobrar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DESPESAS */}
            <div className="border border-white/10 rounded-3xl p-6 space-y-4 shadow-xl" style={{ backgroundColor: cardBgColor }}>
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-sm">Despesas & Custos da Agência</h3>
                <button onClick={() => setShowExpenseModal(true)} className="bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl transition">+ Nova Despesa</button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {expenses.map(exp => (
                  <div key={exp.id} className="bg-black/30 border border-white/5 p-3.5 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                      <span className="font-bold block">{exp.description}</span>
                      <p className="opacity-60 mt-0.5">Vencimento: {new Date(exp.due_date + 'T00:00:00').toLocaleDateString('pt-BR')} • Categoria: {exp.category}</p>
                    </div>
                    <span className="font-black text-red-400 text-sm">R$ {Number(exp.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: POSTS */}
        {activeTab === 'posts' && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold opacity-80">Cronograma de Posts ({posts.length})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {posts.map(p => (
                <div key={p.id} className="border border-white/10 rounded-3xl p-4 space-y-3 shadow-xl" style={{ backgroundColor: cardBgColor }}>
                  <div className="h-40 rounded-2xl overflow-hidden bg-gray-800">
                    <img src={p.media_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&auto=format&fit=crop&q=80'} alt={p.title} className="w-full h-full object-cover" />
                  </div>
                  <span className="text-[10px] font-black uppercase block" style={{ color: priceColor }}>{p.agency_clients?.name}</span>
                  <h3 className="font-bold text-xs">{p.title}</h3>
                  <p className="text-[10px] opacity-60">📅 {new Date(p.scheduled_date + 'T00:00:00').toLocaleDateString('pt-BR')}</p>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-gray-300 border border-white/10 block text-center uppercase">
                    {p.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* MODAL NOVO CLIENTE */}
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

      {/* MODAL NOVO CONTRATO */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveContract} className="border border-white/10 w-full max-w-md rounded-3xl p-6 space-y-3 shadow-2xl" style={{ backgroundColor: cardBgColor }}>
            <h3 className="font-extrabold text-sm text-purple-400">Novo Contrato (Gera Faturas)</h3>
            <select required value={contractForm.client_id} onChange={e => setContractForm({ ...contractForm, client_id: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white font-bold">
              <option value="">Selecione o Cliente...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="text" required placeholder="Nome do Pacote (ex: Pack Bronze)" value={contractForm.contract_name} onChange={e => setContractForm({ ...contractForm, contract_name: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
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
                  <option value="semanal">Semanal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="mensal">Mensal</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] opacity-60 block mb-1">Valor por Parcela (R$):</label>
                <input type="number" required value={contractForm.installment_value} onChange={e => setContractForm({ ...contractForm, installment_value: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-green-400 font-bold" />
              </div>
            </div>
            <div>
              <label className="text-[10px] opacity-60 block mb-1">Data de Início:</label>
              <input type="date" required value={contractForm.start_date} onChange={e => setContractForm({ ...contractForm, start_date: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
            </div>
            <div className="flex space-x-2 pt-2">
              <button type="button" onClick={() => setShowContractModal(false)} className="w-1/2 bg-gray-800 text-xs font-bold py-3 rounded-xl">Cancelar</button>
              <button type="submit" className="w-1/2 bg-purple-600 text-xs font-extrabold py-3 rounded-xl shadow-lg">Gerar Contrato</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL NOVO POST */}
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
            <input type="text" placeholder="Hashtags" value={postForm.hashtags} onChange={e => setPostForm({ ...postForm, hashtags: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
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

      {/* MODAL NOVA DESPESA */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveExpense} className="border border-white/10 w-full max-w-md rounded-3xl p-6 space-y-3 shadow-2xl" style={{ backgroundColor: cardBgColor }}>
            <h3 className="font-extrabold text-sm text-red-400">Cadastrar Contas a Pagar / Equipe</h3>
            <input type="text" required placeholder="Descrição (ex: Assinatura Adobe, Salário Designer)" value={expenseForm.description} onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
            <input type="number" required placeholder="Valor (R$)" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-red-400 font-bold" />
            <input type="date" required value={expenseForm.due_date} onChange={e => setExpenseForm({ ...expenseForm, due_date: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white" />
            <select value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white font-bold">
              <option value="custo_fixo">Custo Fixo</option>
              <option value="salario_equipe">Salário / Equipe</option>
              <option value="ferramenta">Ferramenta / Software</option>
              <option value="imposto">Imposto</option>
            </select>
            <div className="flex space-x-2 pt-2">
              <button type="button" onClick={() => setShowExpenseModal(false)} className="w-1/2 bg-gray-800 text-xs font-bold py-3 rounded-xl">Cancelar</button>
              <button type="submit" className="w-1/2 bg-red-600 text-xs font-extrabold py-3 rounded-xl shadow-lg">Salvar Despesa</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
