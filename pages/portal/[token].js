import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabase';

export default function ClientPortal() {
  const router = useRouter();
  const { token } = router.query;

  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [posts, setPosts] = useState([]);

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

      const { data: tData } = await supabase.from('tenants').select('*').eq('id', cData.tenant_id).maybeSingle();
      if (tData) setTenant(tData);

      const [invRes, pRes] = await Promise.all([
        supabase.from('agency_invoices').select('*').eq('client_id', cData.id).order('due_date', { ascending: true }),
        supabase.from('agency_posts').select('*').eq('client_id', cData.id).order('scheduled_date', { ascending: true })
      ]);

      if (invRes.data) setInvoices(invRes.data);
      if (pRes.data) setPosts(pRes.data);
    } catch (e) {
      console.error("Erro ao carregar portal:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePost = async (postId, status) => {
    await supabase.from('agency_posts').update({ status }).eq('id', postId);
    setPosts(posts.map(p => p.id === postId ? { ...p, status } : p));
  };

  if (loading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans"><p className="text-xs text-gray-400 animate-pulse">Carregando portal do cliente...</p></div>;
  if (!client) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans"><h1 className="text-xl font-bold text-red-500">Portal ou Link Inválido</h1></div>;

  const primaryColor = tenant?.primary_color || '#FF8C00';
  const buttonTextColor = tenant?.button_text_color || '#FFFFFF';
  const secondaryColor = tenant?.secondary_color || '#090D16';
  const cardBgColor = tenant?.card_bg_color || '#111827';
  const textColor = tenant?.text_color || '#FFFFFF';
  const priceColor = tenant?.price_color || '#FF8C00';

  return (
    <div className="min-h-screen font-sans p-4 sm:p-8 max-w-5xl mx-auto space-y-6 pb-20" style={{ backgroundColor: secondaryColor, color: textColor }}>
      <header className="flex items-center space-x-4 border border-white/10 p-6 rounded-3xl shadow-xl" style={{ backgroundColor: cardBgColor }}>
        <img 
          src={client.logo_url || tenant?.logo_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80'} 
          alt="Logo" 
          className="w-16 h-16 rounded-2xl object-cover bg-gray-800 border border-white/10 shadow-lg" 
        />
        <div>
          <h1 className="text-xl font-black">{client.name}</h1>
          <p className="text-xs font-bold mt-0.5" style={{ color: priceColor }}>Portal do Cliente • Aprovação de Conteúdos & Faturas</p>
        </div>
      </header>

      {/* SEÇÃO DE POSTS */}
      <section className="space-y-4">
        <h2 className="text-base font-extrabold" style={{ color: priceColor }}>📅 Seus Conteúdos / Posts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {posts.map(p => (
            <div key={p.id} className="border border-white/10 rounded-3xl p-4 space-y-3 shadow-xl" style={{ backgroundColor: cardBgColor }}>
              <div className="h-44 rounded-2xl overflow-hidden bg-gray-800">
                <img 
                  src={p.media_url || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&auto=format&fit=crop&q=80'} 
                  alt={p.title} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <h3 className="font-bold text-sm">{p.title}</h3>
              <p className="text-xs opacity-80 leading-relaxed">{p.copy_text}</p>
              <div className="flex space-x-2 pt-2">
                <button 
                  onClick={() => handleApprovePost(p.id, 'aprovado')} 
                  className="w-1/2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold py-2.5 rounded-xl transition shadow-md">
                  Aprovar 👍
                </button>
                <button 
                  onClick={() => handleApprovePost(p.id, 'ajustes_solicitados')} 
                  className="w-1/2 bg-red-600/20 text-red-400 border border-red-500/30 text-xs font-bold py-2.5 rounded-xl transition">
                  Ajustar ✏️
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SEÇÃO DE FATURAS */}
      <section className="space-y-4 pt-4 border-t border-white/10">
        <h2 className="text-base font-extrabold text-green-400">💰 Faturas & Mensalidades</h2>
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
