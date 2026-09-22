import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabase';

export default function PublicEventsCalendar() {
  const router = useRouter();
  const { slug } = router.query;

  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState(null);
  const [events, setEvents] = useState([]);
  
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

  const isVenue = tenant?.segment === 'casa_de_eventos';

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

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
    if (isVenue) {
      switch (cat) {
        case 'show': return { label: '🎉 Show / Festa', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
        case 'disponivel': return { label: '📅 Data Disponível', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
        case 'casamento': return { label: '💍 Casamento / Social', bg: 'bg-pink-500/20 text-pink-300 border-pink-500/30' };
        case 'formatura': return { label: '🎓 Formatura / Corp.', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
        default: return { label: '📌 Evento', bg: 'bg-gray-500/20 text-gray-300 border-gray-500/30' };
      }
    } else {
      switch (cat) {
        case 'culto': return { label: '✝️ Culto', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
        case 'evento': return { label: '🎉 Evento', bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30' };
        case 'reuniao': return { label: '👥 Reunião', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
        case 'ensaio': return { label: '🎵 Ensaio', bg: 'bg-green-500/20 text-green-400 border-green-500/30' };
        case 'jovens': return { label: '🔥 Jovens', bg: 'bg-red-500/20 text-red-400 border-red-500/30' };
        default: return { label: '📌 Atividade', bg: 'bg-gray-500/20 text-gray-300 border-gray-500/30' };
      }
    }
  };

  // REDIRECIONA PARA RESERVA DA DATA ESPECÍFICA VIA WHATSAPP
  const handleReserveDate = (dateStr) => {
    const targetPhone = (tenant.commercial_whatsapp || tenant.whatsapp || '').replace(/\D/g, '');
    const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR');
    const message = `Olá! Gostaria de consultar a reserva/orçamento para o dia *${formattedDate}* no *${tenant.name}*.`;
    window.open(`https://wa.me/55${targetPhone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleShareWhatsApp = (ev) => {
    const formattedDate = new Date(ev.event_date + 'T00:00:00').toLocaleDateString('pt-BR');
    let text = `✨ *${ev.title}* — ${tenant.name}\n\n` +
      `📅 *Data:* ${formattedDate} às ${ev.event_time}\n` +
      `📍 *Local:* ${ev.location || 'Espaço Principal'}\n`;
    
    if (ev.speaker) text += `👤 *Atração/Ministro:* ${ev.speaker}\n`;
    if (ev.ticket_url) text += `🎟️ *Comprar Ingresso:* ${ev.ticket_url}\n`;
    
    text += `\n${ev.description || 'Confira os detalhes na nossa programação!'}\n\n` +
      `🔗 Acesse: ${window.location.href}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans"><p className="text-xs text-amber-400 animate-pulse">Carregando programação...</p></div>;
  if (!tenant) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center font-sans"><h1 className="text-xl font-bold text-amber-500">Página não encontrada</h1></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-2 sm:p-6 max-w-6xl mx-auto flex flex-col justify-between">
      
      <div className="space-y-4 sm:space-y-6">
        {/* HEADER SEM O BOTÃO FIXO DO TOPO */}
        <header className="border border-slate-800 bg-slate-900/90 backdrop-blur-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row justify-between items-center gap-4 shadow-2xl text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
            <img 
              src={tenant.logo_url || 'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=150&auto=format&fit=crop&q=80'} 
              alt="Logo" 
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover bg-slate-800 border border-slate-700 shadow-lg" 
            />
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white">{tenant.name}</h1>
              <p className="text-[11px] sm:text-xs font-bold text-amber-400 mt-0.5">
                {isVenue ? '🏛️ Agenda de Eventos & Locação de Espaço' : '✝️ Programação Mensal & Agenda de Eventos'}
              </p>
            </div>
          </div>
        </header>

        {/* FILTROS POR CATEGORIA DEDICADOS */}
        <div className="flex space-x-1.5 sm:space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {isVenue ? (
            [
              { id: 'ALL', label: '🌟 Todos' },
              { id: 'disponivel', label: '📅 Datas Disponíveis' },
              { id: 'show', label: '🎉 Shows & Festas' },
              { id: 'casamento', label: '💍 Casamentos' },
              { id: 'formatura', label: '🎓 Formaturas' }
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold border transition whitespace-nowrap ${
                  selectedCategory === cat.id ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}>
                {cat.label}
              </button>
            ))
          ) : (
            [
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
                className={`px-3 py-2 rounded-xl text-[11px] sm:text-xs font-bold border transition whitespace-nowrap ${
                  selectedCategory === cat.id ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20' : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                }`}>
                {cat.label}
              </button>
            ))
          )}
        </div>

        {/* NAVEGAÇÃO DE MÊS */}
        <div className="border border-slate-800 bg-slate-900 p-3 sm:p-4 rounded-2xl sm:rounded-3xl flex justify-between items-center shadow-xl">
          <button onClick={handlePrevMonth} className="bg-slate-950 hover:bg-slate-800 text-[10px] sm:text-xs font-extrabold px-3 py-2 rounded-xl border border-slate-800 transition">
            ◀ Mês Ant.
          </button>
          <div className="text-center">
            <span className="text-[8px] sm:text-[10px] uppercase font-bold text-slate-400 block tracking-widest">Calendário</span>
            <h2 className="text-xs sm:text-base font-black text-amber-400">{monthNames[month]} / {year}</h2>
          </div>
          <button onClick={handleNextMonth} className="bg-slate-950 hover:bg-slate-800 text-[10px] sm:text-xs font-extrabold px-3 py-2 rounded-xl border border-slate-800 transition">
            Próx. Mês ▶
          </button>
        </div>

        {/* GRADE DO CALENDÁRIO COM RESERVA NO DIA */}
        <div className="border border-slate-800 bg-slate-900 rounded-2xl sm:rounded-3xl p-1.5 sm:p-4 shadow-xl">
          <div className="grid grid-cols-7 gap-1 text-center font-black text-[9px] sm:text-xs mb-1 sm:mb-2 py-1 sm:py-2 border-b border-slate-800 text-amber-400">
            <div>DOM</div><div>SEG</div><div>TER</div><div>QUA</div><div>QUI</div><div>SEX</div><div>SÁB</div>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[70px] sm:h-28 md:h-32 bg-slate-950/40 rounded-xl sm:rounded-2xl opacity-20"></div>
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const dayEvents = filteredEvents.filter(e => e.event_date === dayDateStr);

              // VERIFICA SE O DIA ESTÁ LIVRE OU SE TEM EVENTO DA CATEGORIA 'DISPONIVEL'
              const hasBookedEvent = dayEvents.some(e => e.category !== 'disponivel');
              const hasDisponivelEvent = dayEvents.some(e => e.category === 'disponivel');
              const isFreeDay = isVenue && (!hasBookedEvent || hasDisponivelEvent);

              return (
                <div 
                  key={`day-${dayNum}`} 
                  onClick={() => {
                    if (isFreeDay) handleReserveDate(dayDateStr);
                  }}
                  className={`min-h-[75px] sm:h-28 md:h-32 bg-slate-950/90 border rounded-xl sm:rounded-2xl p-1 sm:p-1.5 flex flex-col justify-between overflow-hidden transition ${
                    isFreeDay 
                      ? 'border-emerald-500/30 hover:border-emerald-400 bg-emerald-950/10 cursor-pointer hover:scale-[0.98]' 
                      : 'border-slate-800/80 hover:border-amber-500/50'
                  }`}>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] sm:text-xs font-extrabold text-slate-400 leading-none">{dayNum}</span>
                    {isFreeDay && (
                      <span className="text-[8px] font-black text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">
                        🟢 Livre
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1 overflow-y-auto max-h-[45px] sm:max-h-16 scrollbar-none my-1">
                    {dayEvents.map(ev => {
                      const badge = getCategoryBadge(ev.category);
                      return (
                        <div
                          key={ev.id}
                          onClick={(e) => {
                            e.stopPropagation(); // Impede de abrir o link do WhatsApp se clicar em um evento ocupado
                            setSelectedEvent(ev);
                          }}
                          className={`p-1 rounded-lg text-[8px] sm:text-[9px] font-extrabold truncate cursor-pointer transition border ${badge.bg} hover:scale-95 shadow-sm`}>
                          <span className="block truncate leading-tight">{ev.title}</span>
                          <span className="text-[7px] sm:text-[8px] opacity-80 block leading-tight">{ev.event_time}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* BOTÃO DE RESERVA DENTRO DO DIA LIVRE */}
                  {isFreeDay && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReserveDate(dayDateStr);
                      }}
                      className="w-full bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-[8px] sm:text-[9px] font-extrabold py-1 rounded-lg transition text-center mt-auto">
                      ✨ Reservar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL DETALHES DO EVENTO */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="border border-slate-800 bg-slate-900 w-full max-w-lg rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase border ${getCategoryBadge(selectedEvent.category).bg}`}>
                {getCategoryBadge(selectedEvent.category).label}
              </span>
              <button onClick={() => setSelectedEvent(null)} className="text-xs font-bold text-slate-400 hover:text-white">✕ Fechar</button>
            </div>

            <h3 className="font-extrabold text-base text-white">{selectedEvent.title}</h3>

            {selectedEvent.image_url && (
              <div className="h-56 sm:h-64 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 shadow-lg">
                <img src={selectedEvent.image_url} alt="Banner" className="w-full h-full object-cover" />
              </div>
            )}

            <div className="text-xs space-y-2 bg-slate-950 p-4 rounded-2xl border border-slate-800">
              <p>📅 Data: <b className="text-amber-400">{new Date(selectedEvent.event_date + 'T00:00:00').toLocaleDateString('pt-BR')} às {selectedEvent.event_time}</b></p>
              <p>📍 Local: <b>{selectedEvent.location || 'Espaço Principal'}</b></p>
              {selectedEvent.speaker && <p>👤 Atração / Ministro: <b className="text-purple-400">{selectedEvent.speaker}</b></p>}
              {selectedEvent.description && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400 block mb-1">Descrição:</span>
                  <p className="text-slate-300 leading-relaxed">{selectedEvent.description}</p>
                </div>
              )}
            </div>

            {/* BOTÃO RESERVAR SE FOR UMA DATA DISPONÍVEL */}
            {selectedEvent.category === 'disponivel' && (
              <button
                onClick={() => handleReserveDate(selectedEvent.event_date)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-3.5 rounded-2xl transition text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20">
                <span>💬 Solicitar Reserva Desta Data</span>
              </button>
            )}

            {/* BOTÃO COMPRAR INGRESSO SE HOUVER LINK */}
            {selectedEvent.ticket_url && (
              <a
                href={selectedEvent.ticket_url.startsWith('http') ? selectedEvent.ticket_url : `https://${selectedEvent.ticket_url}`}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-2xl transition text-xs flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20">
                <span>🎟️ Comprar Ingresso Online</span>
              </a>
            )}

            <button
              onClick={() => handleShareWhatsApp(selectedEvent)}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-extrabold py-3.5 rounded-2xl transition text-xs flex items-center justify-center space-x-2 shadow-lg shadow-green-600/20">
              <span>📲 Compartilhar no WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* RODAPÉ */}
      <footer className="mt-10 border-t border-slate-800/80 pt-6 pb-4 text-center text-xs text-slate-400 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-6xl mx-auto px-2">
          <div className="flex items-center space-x-2.5">
            <img 
              src={tenant.logo_url || 'https://images.unsplash.com/photo-1548625149-fc4a29cf7092?w=150&auto=format&fit=crop&q=80'} 
              alt="Logo" 
              className="w-7 h-7 rounded-lg object-cover bg-slate-800 border border-slate-700" 
            />
            <span className="font-bold text-white text-xs sm:text-sm">{tenant.name}</span>
          </div>

          {tenant.instagram_url && (
            <a 
              href={tenant.instagram_url.startsWith('http') ? tenant.instagram_url : `https://instagram.com/${tenant.instagram_url.replace('@', '')}`} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-extrabold px-3.5 py-1.5 rounded-xl text-[11px] shadow-lg hover:opacity-90 transition">
              <span>📸 Instagram</span>
            </a>
          )}
        </div>

        <div className="border-t border-slate-800/60 pt-3 flex flex-col sm:flex-row justify-between items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 max-w-6xl mx-auto px-2">
          <p>© {new Date().getFullYear()} {tenant.name}. Todos os direitos reservados.</p>
          <p className="flex items-center space-x-1">
            <span>Desenvolvido por</span>
            <a 
              href="https://wa.me/5547996302864?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20os%20seus%20servi%C3%A7os." 
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
