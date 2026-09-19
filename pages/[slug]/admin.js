import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function AdminRedirect() {
  const router = useRouter();
  const { slug } = router.query;

  useEffect(() => {
    if (slug) {
      router.replace(`/${slug}/dashboard`);
    }
  }, [slug, router]);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center font-sans">
      <p className="text-xs text-gray-400">A redirecionar para o ERP da Agência...</p>
    </div>
  );
}
