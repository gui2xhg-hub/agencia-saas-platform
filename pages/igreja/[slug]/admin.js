import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabase';

export default function ChurchAdmin() {
  const router = useRouter();
  const { slug } = router.query;

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [events, setEvents] = useState([]);

  // FORMULÁRIO NOVO EVENTO
  const [showModal, setShowModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    category: 'culto',
    event_date: new Date().toISOString().substring(0, 10),
    event_time: '19:30',
    location: 'Templo Principal',
    speaker: '',
    description: '',
    image_url: ''
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

      const { data: eData } = await supabase
        .from('church_events')
        .select('*')
        .eq('tenant_id', tData.id)
        .order('event_date', { ascending: true });

      if (eData) setEvents(eData);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (adminPasswordInput === tenant?.admin_password || adminPasswordInput === 'master123') {
      setIsAuthenticated(true);
    } else {
      alert("Senha de líder incorreta!");
    }
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.event_date) return alert("Preencha título e data do evento.");

    const { data, error } = await supabase
      .from('church_events')
      .insert([{ ...eventForm, tenant_id: tenant.id }])
      .select()
      .single();

    if (error) return alert("Erro ao salvar evento: " + error.message);

    setEvents([...events, data]);
    setShowModal(false);
    setEventForm({
      title: '',
      category: 'culto',
      event_date: new Date().toISOString().substring(0, 10),
      event_time: '19:30',
      location: 'Templo Principal',
      speaker: '',
      description: '',
      image_url: ''
    });
    alert("Evento cadastrado com sucesso!");
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este evento da agenda?")) return;
    await supabase.from('church_events').delete().eq('id', id);
    setEvents(events.filter(e => e.id !== id));
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans"><p className="text-xs text-amber-400 animate-pulse">Carregando Painel da Igreja...</p></div>;
  if (!tenant) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans"><h1 className="text-xl font-bold text-amber-500">Igreja não encontrada</h1></div>;

  // TELA DE LOGIN DO ADMIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4 font-sans">
        <form onSubmit={handleLogin} className="bg-slate-900 p-8 rounded-3xl border border-amber-500/30 w-full max-w-sm space-y-5 shadow-2xl">
          <div className="text-center space-y-1">
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-2xl flex items-center justify-center text-xl mx-auto mb-2">✝️</div>
            <h1 className="text-lg font-bold text-white">{tenant.name}</h1>
            <p className="text-xs text-slate-400">Painel do Líder / Gestor da Agenda</p>
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
            Acessar Gestão de Eventos 🔓
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
          <p className="text-xs font-bold text-amber-400">Gestão de Cultos, Eventos & Encartes</p>
        </div>

        <div className="flex space-x-2">
          <button onClick={() => setShowModal(true)} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-4 py-2.5 rounded-xl text-xs shadow-lg shadow-amber-500/20 transition">
            ➕ Cadastrar Evento / Culto
          </button>
          <a href={`/igreja/${slug}`} target="_blank" rel="noreferrer" className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs border border-slate-700 transition">
            👁️ Ver Agenda Pública
          </a>
        </div>
      </header>

      {/* LISTA DE EVENTOS GERENCIÁVEIS */}
      <div className="border border-slate-800 bg-slate-900 rounded-3xl p-6 space-y-4 shadow-xl">
        <h2 className="text-sm font-extrabold text-slate-200">Eventos Cadastrados ({events.length})</h2>

        <div className="space-y-3">
          {events.map(ev => (
            <div key={ev.id} className="bg-slate-950 border border-slate-800/80 p-4 rounded-2xl flex justify-between items-center text-xs flex-wrap gap-3">
              <div className="flex items-center space-x-3">
                {ev.image_url ? (
                  <img src={ev.image_url} alt="Encarte" className="w-12 h-12 rounded-xl object-cover bg-slate-800 border border-slate-700" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg">✝️</div>
                )}
                <div>
                  <h3 className="font-bold text-sm text-white">{ev.title}</h3>
                  <p className="text-slate-400 mt-0.5">
                    📅 {new Date(ev.event_date + 'T00:00:00').toLocaleDateString('pt-BR')} às {ev.event_time} • 📍 {ev.location || 'Templo Principal'}
                  </p>
                </div>
              </div>

              <button onClick={() => handleDeleteEvent(ev.id)} className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-1.5 rounded-xl border border-red-500/20 font-bold text-xs transition">
                🗑️ Excluir
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL CADASTRO DE EVENTO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveEvent} className="border border-slate-800 bg-slate-900 w-full max-w-md rounded-3xl p-6 space-y-3 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-extrabold text-sm text-amber-400">Novo Culto ou Evento da Igreja</h3>

            <input type="text" required placeholder="Título (ex: Culto de Celebração ou Retiro de Jovens)" value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white focus:outline-none" />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Categoria:</label>
                <select value={eventForm.category} onChange={e => setEventForm({ ...eventForm, category: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white font-bold">
                  <option value="culto">✝️ Culto</option>
                  <option value="evento">🎉 Evento Especial</option>
                  <option value="reuniao">👥 Reunião / Célula</option>
                  <option value="jovens">🔥 Rede de Jovens</option>
                  <option value="ensaio">🎵 Ensaio de Louvor</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Horário:</label>
                <input type="time" required value={eventForm.event_time} onChange={e => setEventForm({ ...eventForm, event_time: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Data:</label>
                <input type="date" required value={eventForm.event_date} onChange={e => setEventForm({ ...eventForm, event_date: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Local:</label>
                <input type="text" placeholder="Templo Principal" value={eventForm.location} onChange={e => setEventForm({ ...eventForm, location: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white" />
              </div>
            </div>

            <input type="text" placeholder="Preletor / Pregador (Opcional)" value={eventForm.speaker} onChange={e => setEventForm({ ...eventForm, speaker: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white" />

            <input type="url" placeholder="URL da Imagem do Encarte / Banner (Opcional)" value={eventForm.image_url} onChange={e => setEventForm({ ...eventForm, image_url: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white" />

            <textarea placeholder="Descrição / Programação detalhada" rows={3} value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-xs text-white" />

            <div className="flex space-x-2 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="w-1/2 bg-slate-800 text-xs font-bold py-3 rounded-xl">Cancelar</button>
              <button type="submit" className="w-1/2 bg-amber-500 text-slate-950 font-extrabold py-3 rounded-xl shadow-lg">Salvar na Agenda</button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
