import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabase';

export default function ChurchMemberCalendar() {
  const router = useRouter();
  const { slug } = router.query;

  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [events, setEvents] = useState([]);
  
  // NAVEGAÇÃO E FILTROS
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedEvent, setSelectedEvent] = useState(null);

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
      console.error("Erro ao carregar agenda:", err);
    } finally {
      setLoading(false);
    }
  };

  // NAVEGAÇÃO DE MÊS
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  // FILTRAGEM DE EVENTOS
  const filteredEvents = events.filter(e => {
    if (!e.event_date) return false;
    const d = new Date(e.event_date + 'T00:00:00');
    const matchesMonth = d.getFullYear() === year && d.getMonth() === month;
    const matchesCategory = selectedCategory === 'ALL' || e.category === selectedCategory;
    return matchesMonth && matchesCategory;
  });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'culto': return { label: '✝️ Culto', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'evento': return { label: '🎉 Evento Especial', bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
      case 'reuniao': return { label: '👥 Reunião / Célula', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'ensaio': return { label: '🎵 Ensaio Louvor', bg: 'bg-green-500/20 text-green-400 border-green-500/30' };
      case 'jovens': return { label: '🔥 Rede de Jovens', bg: 'bg-red-500/20 text-red-400 border-red-500/30' };
      default: return { label: '📌 Atividade', bg: 'bg-gray-500/20 text-gray-300 border-gray-500/30' };
    }
  };

  const handleShareWhatsApp = (ev) => {
    const formattedDate = new Date(ev.event_date + 'T00:00:00').toLocaleDateString('pt-BR');
    const text = `✝️ *${ev.title}* — ${tenant.name}\n\n` +
      `📅 *Data:* ${formattedDate} às ${ev.event_time}\n` +
      `📍 *Local:* ${ev.location || 'Templo Principal'}\n` +
      (ev.speaker ? `👤 *Preletor:* ${ev.speaker}\n` : '') +
      `\n${ev.description || 'Venha participar conosco e traga sua família!'}\n\n` +
      `🔗 Veja a programação completa: ${window.location.href}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans"><p className="text-xs text-amber-400 animate-pulse">Carregando Agenda da Igreja...</p></div>;
  if (!tenant) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans"><h1 className="text-xl font-bold text-amber-500">Igreja não encontrada</h1></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-3 sm:p-8 max-w-6xl mx-auto flex flex-col justify-between">
      
      <div className="space-y-6">
        {/* HEADER DA IGREJA */}
        <header className="border border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 sm:p-6 rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xl text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <img 
              src={tenant.logo_url || 'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=150&auto=format&fit=crop&q=80'} 
              alt="Logo Church" 
              className="w-16 h-16 rounded-2xl object-cover bg-slate-800 border border-slate-700 shadow-lg" 
            />
            <div>
              <h1 className="text-xl font-black text-white">{tenant.name}</h1>
              <p className="text-xs font-bold text-amber-400 mt-0.5">Programação Mensal & Agenda de Eventos</p>
            </div>
          </div>

          <a 
            href={`/igreja/${slug}/admin`} 
            className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs border border-slate-700 transition">
            🔐 Área do Líder / Admin
          </a>
        </header>

        {/* FILTROS POR CATEGORIA */}
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'ALL', label: '🌟 Todos' },
            { id: 'culto', label: '✝️ Cultos' },
            { id: 'evento', label: '🎉 Eventos' },
            { id: 'reuniao', label: '👥 Reuniões' },
            { id: 'jovens', label: '🔥 Jovens' },
            { id: 'ensaio', label: '🎵 Ensaios' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition whitespace-nowrap ${
                selectedCategory === cat.id ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
              }`}>
              {cat.label}
            </button>
          ))}
        </div>

        {/* CONTROLE MENSAL */}
        <div className="border border-slate-800 bg-slate-900 p-3 sm:p-4 rounded-3xl flex justify-between items-center shadow-xl">
          <button onClick={handlePrevMonth} className="bg-slate-950 hover:bg-slate-800 text-[11px] sm:text-xs font-extrabold px-3 py-2 rounded-xl border border-slate-800 transition">
            ◀ Mês Ant.
          </button>
          <div className="text-center">
            <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-widest">Agenda Ativa</span>
            <h2 className="text-sm sm:text-base font-black text-amber-400">{monthNames[month]} / {year}</h2>
          </div>
          <button onClick={handleNextMonth} className="bg-slate-950 hover:bg-slate-800 text-[11px] sm:text-xs font-extrabold px-3 py-2 rounded-xl border border-slate-800 transition">
            Próx. Mês ▶
          </button>
        </div>

        {/* VISÃO DESKTOP: GRADE DO CALENDÁRIO */}
        <div className="hidden md:block border border-slate-800 bg-slate-900 rounded-3xl p-4 shadow-xl overflow-x-auto">
          <div className="grid grid-cols-7 gap-1 text-center font-extrabold text-xs mb-2 py-2 border-b border-slate-800 text-amber-400">
            <div>DOM</div><div>SEG</div><div>TER</div><div>QUA</div><div>QUI</div><div>SEX</div><div>SÁB</div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-32 bg-slate-950/40 rounded-2xl opacity-20"></div>
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = filteredEvents.filter(e => e.event_date === dayDateStr);

              return (
                <div key={`day-${dayNum}`} className="h-32 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-1.5 space-y-1 overflow-hidden hover:border-slate-700 transition">
                  <span className="text-[10px] font-bold text-slate-400 block">{dayNum}</span>
                  <div className="space-y-1 overflow-y-auto max-h-24">
                    {dayEvents.map(ev => {
                      const badge = getCategoryBadge(ev.category);
                      return (
                        <div
                          key={ev.id}
                          onClick={() => setSelectedEvent(ev)}
                          className={`p-1.5 rounded-xl text-[9px] font-extrabold truncate cursor-pointer transition border ${badge.bg} hover:scale-95`}>
                          <span className="block truncate">{ev.title}</span>
                          <span className="text-[8px] opacity-80 block">{ev.event_time}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* VISÃO MOBILE: CARDS/LISTA COMPACTA */}
        <div className="block md:hidden space-y-3">
          <div className="text-center pb-1">
            <span className="text-xs font-bold text-slate-400">📋 Programação do Mês ({filteredEvents.length})</span>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-2">
              <span className="text-2xl">📅</span>
              <p className="text-xs font-bold text-slate-400">Nenhum evento ou culto agendado para este mês.</p>
            </div>
          ) : (
            filteredEvents.map(ev => {
              const badge = getCategoryBadge(ev.category);
              const eventDateObj = new Date(ev.event_date + 'T00:00:00');
              const dayNum = eventDateObj.getDate();
              const weekDayName = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][eventDateObj.getDay()];

              return (
                <div 
                  key={ev.id} 
                  onClick={() => setSelectedEvent(ev)}
                  className="bg-slate-900 border border-slate-800/80 hover:border-amber-500/50 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-lg active:scale-98 transition cursor-pointer">
                  
                  <div className="flex items-center space-x-3.5">
                    {/* DATA DESTAQUE */}
                    <div className="bg-slate-950 border border-slate-800 rounded-2xl w-12 h-12 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-black uppercase text-amber-400">{weekDayName}</span>
                      <span className="text-base font-black text-white leading-none">{dayNum}</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-md uppercase border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">🕒 {ev.event_time}</span>
                      </div>
                      <h3 className="font-extrabold text-sm text-white leading-tight">{ev.title}</h3>
                      {ev.speaker && <p className="text-[10px] text-purple-400 font-bold">👤 {ev.speaker}</p>}
                    </div>
                  </div>

                  <span className="text-slate-500 text-xs font-bold">▶</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL DETALHES DO EVENTO / ENCARTE */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="border border-slate-800 bg-slate-900 w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase border ${getCategoryBadge(selectedEvent.category).bg}`}>
                {getCategoryBadge(selectedEvent.category).label}
              </span>
              <button onClick={() => setSelectedEvent(null)} className="text-xs font-bold text-slate-400 hover:text-white">✕ Fechar</button>
            </div>

            <h3 className="font-extrabold text-base text-white">{selectedEvent.title}</h3>

            {selectedEvent.image_url && (
              <div className="h-64 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 shadow-lg">
                <img src={selectedEvent.image_url} alt="Encarte" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="text-xs space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <p>📅 Data: <b className="text-amber-400">{new Date(selectedEvent.event_date + 'T00:00:00').toLocaleDateString('pt-BR')} às {selectedEvent.event_time}</b></p>
              <p>📍 Local: <b>{selectedEvent.location || 'Templo Principal'}</b></p>
              {selectedEvent.speaker && <p>👤 Preletor/Ministro: <b className="text-purple-400">{selectedEvent.speaker}</b></p>}
              {selectedEvent.description && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400 block mb-1">Descrição / Programação:</span>
                  <p className="text-slate-300 leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => handleShareWhatsApp(selectedEvent)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-extrabold py-3.5 rounded-2xl transition text-xs flex items-center justify-center space-x-2 shadow-lg shadow-green-600/20">
              <span>📲 Convidar no WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* RODAPÉ PROFISSIONAL COM INSTAGRAM E CRÉDITOS */}
      <footer className="mt-12 border-t border-slate-800/80 pt-8 pb-4 text-center text-xs text-slate-400 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto px-2">
          {/* LOGO E NOME DA IGREJA */}
          <div className="flex items-center space-x-3">
            <img 
              src={tenant.logo_url || 'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=150&auto=format&fit=crop&q=80'} 
              alt="Logo Igreja" 
              className="w-8 h-8 rounded-lg object-cover bg-slate-800 border border-slate-700" 
            />
            <span className="font-bold text-white text-sm">{tenant.name}</span>
          </div>

          {/* INSTAGRAM DA IGREJA */}
          {tenant.instagram_url && (
            <a 
              href={tenant.instagram_url.startsWith('http') ? tenant.instagram_url : `https://instagram.com/${tenant.instagram_url.replace('@', '')}`} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-extrabold px-4 py-2 rounded-xl text-xs shadow-lg hover:opacity-90 transition">
              <span>📸 Siga no Instagram</span>
            </a>
          )}
        </div>

        <div className="border-t border-slate-800/60 pt-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-slate-500 max-w-6xl mx-auto px-2">
          <p>© {new Date().getFullYear()} {tenant.name}. Todos os direitos reservados.</p>
          <p className="flex items-center space-x-1">
            <span>Desenvolvido por</span>
            <a 
              href="https://wa.me/5547996302864?text=Ol%C3%A1!%20Vim%20pelo%20sistema%20da%20igreja%20e%20gostaria%20de%20saber%20mais%20sobre%20os%20seus%20servi%C3%A7os." 
              target="_blank" 
              rel="noreferrer" 
              className="font-bold text-amber-400 hover:text-amber-300 underline transition">
              SinergeMKT
            </a>
          </p>
        </div>
      </footer>

    </div>
  );
}
