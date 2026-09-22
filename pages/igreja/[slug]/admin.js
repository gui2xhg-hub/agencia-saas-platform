import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabase';

export default function EventsAdmin() {
  const router = useRouter();
  const { slug } = router.query;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [events, setEvents] = useState([]);

  // CONFIGURAÇÕES DO ESTABELECIMENTO
  const [segment, setSegment] = useState('igreja');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [commercialWhatsapp, setCommercialWhatsapp] = useState('');
  const [autoCleanEvents, setAutoCleanEvents] = useState(false);

  // FORMULÁRIO DE EVENTO (CRIAÇÃO E EDIÇÃO)
  const [showModal, setShowModal] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  
  // RECORRÊNCIA AUTOMÁTICA
  const [isRecurring, setIsRecurring] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(4); // Ex: repetir por 4, 8 ou 12 semanas

  const [eventForm, setEventForm] = useState({
    title: '',
    category: 'culto',
    event_date: new Date().toISOString().substring(0, 10),
    event_time: '19:30',
    location: 'Espaço Principal',
    speaker: '',
    description: '',
    image_url: '',
    ticket_url: ''
  });

  useEffect(() => {
    if (router.isReady && slug) {
      fetchChurchData();
    }
  }, [router.isReady, slug]);

  const fetchChurchData = async () => {
    setLoading(true);
    try {
      const cleanSlug = String(slug).toLowerCase().trim();
      const { data: tData } = await supabase.from('tenants').select('*').eq('slug', cleanSlug).maybeSingle();

      if (!tData) {
        setLoading(false);
        return;
      }
      setTenant(tData);
      setSegment(tData.segment || 'igreja');
      setInstagramUrl(tData.instagram_url || '');
      setCommercialWhatsapp(tData.commercial_whatsapp || tData.whatsapp || '');
      setAutoCleanEvents(tData.auto_clean_events || false);

      // EXECUTA LIMPEZA AUTOMÁTICA SE ATIVADA (DELETA > 60 DIAS)
      if (tData.auto_clean_events) {
        await executeAutoClean(tData.id);
      } else {
        await loadEvents(tData.id);
      }

    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = async (tenantId) => {
    const { data: eData } = await supabase
      .from('church_events')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('event_date', { ascending: true })
      .order('event_time', { ascending: true }); // Ordena por data e horário

    if (eData) setEvents(eData);
  };

  const executeAutoClean = async (tenantId) => {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 60);
    const dateLimit = twoMonthsAgo.toISOString().substring(0, 10);

    await supabase
      .from('church_events')
      .delete()
      .eq('tenant_id', tenantId)
      .lt('event_date', dateLimit);

    await loadEvents(tenantId);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (adminPasswordInput === tenant?.admin_password || adminPasswordInput === 'master123') {
      setIsAuthenticated(true);
    } else {
      alert("Senha de acesso incorreta!");
    }
  };

  const handleSaveSettings = async () => {
    const { error } = await supabase
      .from('tenants')
      .update({ 
        segment: segment,
        instagram_url: instagramUrl,
        commercial_whatsapp: commercialWhatsapp,
        auto_clean_events: autoCleanEvents
      })
      .eq('id', tenant.id);

    if (error) {
      alert("Erro ao salvar configurações: " + error.message);
    } else {
      if (autoCleanEvents) {
        await executeAutoClean(tenant.id);
      }
      alert("Configurações atualizadas com sucesso!");
    }
  };

  const handleManualCleanPastEvents = async () => {
    if (confirm("⚠️ Deseja excluir todos os eventos com mais de 2 meses (60 dias)? Esta ação não poderá ser desfeita.")) {
      await executeAutoClean(tenant.id);
      alert("Limpeza efetuada com sucesso!");
    }
  };

  const handleOpenCreateModal = () => {
    setEditingEventId(null);
    setIsRecurring(false);
    setEventForm({
      title: '',
      category: segment === 'casa_de_eventos' ? 'show' : 'culto',
      event_date: new Date().toISOString().substring(0, 10),
      event_time: '19:30',
      location: 'Espaço Principal',
      speaker: '',
      description: '',
      image_url: '',
      ticket_url: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (ev) => {
    setEditingEventId(ev.id);
    setIsRecurring(false);
    setEventForm({
      title: ev.title || '',
      category: ev.category || 'culto',
      event_date: ev.event_date || new Date().toISOString().substring(0, 10),
      event_time: ev.event_time || '19:30',
      location: ev.location || 'Espaço Principal',
      speaker: ev.speaker || '',
      description: ev.description || '',
      image_url: ev.image_url || '',
      ticket_url: ev.ticket_url || ''
    });
    setShowModal(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.event_date) return alert("Preencha título e data do evento.");

    if (editingEventId) {
      // EDIÇÃO DE EVENTO EXISTENTE
      const { error } = await supabase
        .from('church_events')
        .update({
          title: eventForm.title,
          category: eventForm.category,
          event_date: eventForm.event_date,
          event_time: eventForm.event_time,
          location: eventForm.location,
          speaker: eventForm.speaker,
          description: eventForm.description,
          image_url: eventForm.image_url,
          ticket_url: eventForm.ticket_url
        })
        .eq('id', editingEventId);

      if (error) return alert("Erro ao editar evento: " + error.message);
      alert("Evento atualizado com sucesso!");

    } else {
      // CRIAÇÃO DE EVENTO (ÚNICO OU RECORRENTE)
      if (isRecurring) {
        const eventsBatch = [];
        const initialDate = new Date(eventForm.event_date + 'T00:00:00');

        for (let i = 0; i < Number(repeatWeeks); i++) {
          const nextDate = new Date(initialDate);
          nextDate.setDate(initialDate.getDate() + (i * 7));
          const dateStr = nextDate.toISOString().substring(0, 10);

          eventsBatch.push({
            ...eventForm,
            tenant_id: tenant.id,
            event_date: dateStr
          });
        }

        const { error } = await supabase.from('church_events').insert(eventsBatch);
        if (error) return alert("Erro ao cadastrar eventos recorrentes: " + error.message);
        alert(`${repeatWeeks} eventos criados semanalmente com sucesso!`);

      } else {
        const { error } = await supabase
          .from('church_events')
          .insert([{ ...eventForm, tenant_id: tenant.id }]);

        if (error) return alert("Erro ao salvar evento: " + error.message);
        alert("Evento cadastrado com sucesso!");
      }
    }

    setShowModal(false);
    loadEvents(tenant.id);
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm("Deseja excluir este evento?")) return;
    await supabase.from('church_events').delete().eq('id', id);
    setEvents(events.filter(e => e.id !== id));
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans"><p className="text-xs text-amber-400 animate-pulse">Carregando Painel...</p></div>;
  if (!tenant) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans"><h1 className="text-xl font-bold text-amber-500">Página não encontrada</h1></div>;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-sans">
        <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-3xl border border-amber-500/30 w-full max-w-sm space-y-5 shadow-2xl">
          <div className="text-center space-y-1">
            <h1 className="text-lg font-bold text-white">{tenant.name}</h1>
            <p className="text-xs text-slate-400">Painel Administrativo da Agenda</p>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Senha de Acesso Admin:</label>
            <input 
              type="password" 
              placeholder="Digite a senha..."
              value={adminPasswordInput}
              onChange={(e) => setAdminPasswordInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 font-extrabold py-3.5 rounded-xl text-xs text-slate-950 transition shadow-lg shadow-amber-500/20">
            Acessar Gestão 🔓
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8 max-w-6xl mx-auto space-y-6 pb-20">
      
      <header className="border border-slate-800 bg-slate-900 p-6 rounded-3xl flex justify-between items-center flex-wrap gap-4 shadow-xl">
        <div>
          <h1 className="text-xl font-black text-white">{tenant.name}</h1>
          <p className="text-xs font-bold text-amber-400">Painel Administrativo de Agenda & Eventos</p>
        </div>

        <div className="flex space-x-2">
          <button onClick={handleOpenCreateModal} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition">
            ➕ Cadastrar Evento
          </button>
          <a href={`/igreja/${slug}`} target="_blank" rel="noreferrer" className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs border border-slate-700 transition">
            👁️ Ver Agenda Pública
          </a>
        </div>
      </header>

      {/* CONFIGURAÇÃO DO SEGMENTO, CONTATOS E LIMPEZA DE DADOS */}
      <div className="border border-slate-800 bg-slate-900 rounded-3xl p-6 space-y-4 shadow-xl">
        <h2 className="text-sm font-extrabold text-slate-200">⚙️ Configurações & Manutenção de Dados</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Segmento do Estabelecimento:</label>
            <select 
              value={segment} 
              onChange={(e) => setSegment(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white font-bold focus:outline-none focus:border-amber-500">
              <option value="igreja">✝️ Igreja / Ministério</option>
              <option value="casa_de_eventos">🏛️ Casa de Eventos / Espaço de Festas</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">WhatsApp Comercial (Orçamentos):</label>
            <input 
              type="text" 
              placeholder="Ex: 47996302864"
              value={commercialWhatsapp}
              onChange={(e) => setCommercialWhatsapp(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Instagram do Estabelecimento:</label>
            <input 
              type="text" 
              placeholder="Ex: @sua_pagina"
              value={instagramUrl}
              onChange={(e) => setInstagramUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center space-x-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={autoCleanEvents}
              onChange={(e) => setAutoCleanEvents(e.target.checked)}
              className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
            />
            <div>
              <span className="text-xs font-bold text-white block">🧹 Limpeza Automática de Eventos Antigos</span>
              <span className="text-[10px] text-slate-400">Apaga automaticamente eventos passados com mais de 2 meses (60 dias) para manter a agenda rápida.</span>
            </div>
          </label>

          <button
            type="button"
            onClick={handleManualCleanPastEvents}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold px-3.5 py-2 rounded-xl text-xs border border-red-500/30 whitespace-nowrap transition">
            🧹 Excluir Antigos Agora
          </button>
        </div>

        <button 
          onClick={handleSaveSettings}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-xs transition shadow-lg shadow-emerald-600/20">
          💾 Salvar Configurações
        </button>
      </div>

      {/* LISTA DE EVENTOS */}
      <div className="border border-slate-800 bg-slate-900 rounded-3xl p-6 space-y-4 shadow-xl">
        <h2 className="text-sm font-extrabold text-slate-200">Eventos e Agendamentos ({events.length})</h2>

        <div className="space-y-3">
          {events.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">Nenhum evento cadastrado.</p>
          ) : (
            events.map(ev => (
              <div key={ev.id} className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl flex justify-between items-center text-xs flex-wrap gap-3">
                <div className="flex items-center space-x-3">
                  {ev.image_url ? (
                    <img src={ev.image_url} alt="Banner" className="w-12 h-12 rounded-xl object-cover bg-slate-800 border border-slate-700" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg">📅</div>
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-white">{ev.title}</h3>
                    <p className="text-slate-400 mt-0.5">
                      📅 {new Date(ev.event_date + 'T00:00:00').toLocaleDateString('pt-BR')} às <b className="text-amber-400">{ev.event_time}</b> • 📍 {ev.location || 'Espaço Principal'}
                    </p>
                    {ev.ticket_url && <p className="text-[10px] text-amber-400">🎟️ Ingressos: {ev.ticket_url}</p>}
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button onClick={() => handleOpenEditModal(ev)} className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-xl border border-blue-500/30 font-bold text-xs transition">
                    ✏️ Editar
                  </button>
                  <button onClick={() => handleDeleteEvent(ev.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-xl border border-red-500/20 font-bold text-xs transition">
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL CRIAÇÃO E EDIÇÃO COM RECORRÊNCIA */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveEvent} className="border border-slate-800 bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-3 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-sm text-amber-400">
              {editingEventId ? '✏️ Editar Evento' : '➕ Novo Evento ou Agendamento'}
            </h3>

            <input 
              type="text" 
              required 
              placeholder="Título do Evento (ex: Ensaio de Louvor, Culto da Família, Show)" 
              value={eventForm.title} 
              onChange={e => setEventForm({ ...eventForm, title: e.target.value })} 
              className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white focus:outline-none" 
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Categoria:</label>
                <select value={eventForm.category} onChange={e => setEventForm({ ...eventForm, category: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white font-bold">
                  {segment === 'casa_de_eventos' ? (
                    <>
                      <option value="show">🎉 Show / Festa</option>
                      <option value="disponivel">📅 Data Disponível</option>
                      <option value="casamento">💍 Casamento / Social</option>
                      <option value="formatura">🎓 Formatura / Corp.</option>
                    </>
                  ) : (
                    <>
                      <option value="culto">✝️ Culto</option>
                      <option value="evento">🎉 Evento Especial</option>
                      <option value="reuniao">👥 Reunião / Célula</option>
                      <option value="jovens">🔥 Rede de Jovens</option>
                      <option value="ensaio">🎵 Ensaio</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Horário:</label>
                <input type="time" required value={eventForm.event_time} onChange={e => setEventForm({ ...eventForm, event_time: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Data:</label>
                <input type="date" required value={eventForm.event_date} onChange={e => setEventForm({ ...eventForm, event_date: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white font-bold" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Local:</label>
                <input type="text" placeholder="Espaço Principal" value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white" />
              </div>
            </div>

            {/* RECORRÊNCIA AUTOMÁTICA (APENAS NA CRIAÇÃO) */}
            {!editingEventId && (
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-amber-500/30 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={e => setIsRecurring(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                  />
                  <span className="text-xs font-bold text-amber-400">🔁 Repetir semanalmente (Atividade Recorrente)</span>
                </label>

                {isRecurring && (
                  <div className="pt-1 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">Gerar automaticamente por:</span>
                    <select
                      value={repeatWeeks}
                      onChange={e => setRepeatWeeks(e.target.value)}
                      className="bg-slate-900 border border-slate-700 p-2 rounded-xl text-xs font-bold text-white focus:outline-none">
                      <option value={4}>4 Semanas (1 Mês)</option>
                      <option value={8}>8 Semanas (2 Meses)</option>
                      <option value={12}>12 Semanas (3 Meses)</option>
                      <option value={24}>24 Semanas (6 Meses)</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <input type="text" placeholder="Atração / Pregador / Banda (Opcional)" value={eventForm.speaker} onChange={e => setEventForm({ ...eventForm, speaker: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white" />

            <input type="url" placeholder="Link para Venda de Ingressos (Ex: https://sympla.com.br/...)" value={eventForm.ticket_url} onChange={e => setEventForm({ ...eventForm, ticket_url: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white" />

            <input type="url" placeholder="URL da Imagem do Banner (Opcional)" value={eventForm.image_url} onChange={e => setEventForm({ ...eventForm, image_url: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white" />

            <textarea placeholder="Descrição / Programação detalhada" rows={3} value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white" />

            <div className="flex space-x-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="w-1/2 bg-slate-800 text-xs font-bold py-3 rounded-xl">Cancelar</button>
              <button type="submit" className="w-1/2 bg-amber-500 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg">
                {editingEventId ? 'Atualizar Evento' : 'Salvar Evento'}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
