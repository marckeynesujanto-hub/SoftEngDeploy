'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/app/supabaseClient'
import Link from 'next/link'
import InstallPrompt from '@/app/install/installprompt'

const features = [
  {
    href: '/subscription',
    icon: '🚛',
    title: 'Jemput Sampah',
    desc: 'Langganan harian atau mingguan, atur jadwal sendiri',
    color: 'bg-green-50 border-green-200',
    iconBg: 'bg-green-100',
    badge: null,
  },
  {
    href: '/leaderboard',
    icon: '🏆',
    title: 'Poin & Peringkat',
    desc: 'Kumpulkan poin dari daur ulang, menangkan hadiah',
    color: 'bg-yellow-50 border-yellow-200',
    iconBg: 'bg-yellow-100',
    badge: 'Hadiah Bulanan',
  },
  {
    href: '/map',
    icon: '🗺️',
    title: 'Peta & TPS',
    desc: 'Temukan tempat sampah terdekat di sekitarmu',
    color: 'bg-blue-50 border-blue-200',
    iconBg: 'bg-blue-100',
    badge: null,
  },
  {
    href: '/marketplace',
    icon: '♻️',
    title: 'Jual Beli Sampah',
    desc: 'Jual sampah daur ulangmu atau beli dari orang lain',
    color: 'bg-teal-50 border-teal-200',
    iconBg: 'bg-teal-100',
    badge: 'Baru',
  },
]

export default function Home() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const userId = localStorage.getItem('user_id');
      if (!userId) return; // Jika belum login, biarkan saja

      // Ambil data user & poin
      const { data: user, error } = await supabase
        .from('users')
        .select('user_name, user_point')
        .eq('user_id', userId)
        .single();

      // Ambil ranking dari tabel leaderboard
      const { data: rank } = await supabase
        .from('leaderboards')
        .select('leaderboard_ranking')
        .eq('user_id', userId)
        .single();

      if (user) {
        setUserData({
          ...user,
          ranking: rank?.leaderboard_ranking || '-'
        });
      }
      setLoading(false);
    };

    fetchUserData();
  }, []);

  if (loading) return <div className="p-10">Loading...</div>;



  return (
    <div className="min-h-screen bg-gray-50">
      <InstallPrompt />

      {/* Header */}
      <div className="bg-green-600 px-5 pt-14 pb-8 rounded-b-3xl">
        <div className="flex items-start justify-between">
          <div>
            {/* Bagian ini yang diubah */}
            <p className="text-green-200 text-sm">
              Halo, {userData?.user_name || 'User'} 👋
            </p>
            
            <h1 className="text-white text-2xl font-bold mt-0.5">TrashIN</h1>
            <p className="text-green-100 text-sm mt-0.5">Kelola sampah, jaga lingkungan</p>
          </div>
          
          <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center text-xl">
            👤
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-3 mt-5">
          {[
            { value: userData?.user_point || 0, label: 'Poin Anda' },
            { value: '3', label: 'Penjemputan' },
            { value: userData?.ranking || '-', label: 'Peringkat' },
          ].map(s => (
            <div key={s.label} className="flex-1 bg-white/20 rounded-2xl p-3 text-center">
              <p className="text-white text-xl font-bold">{s.value}</p>
              <p className="text-green-100 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Next Pickup Card */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-2xl">📅</div>
          <div className="flex-1">
            <p className="text-xs text-gray-400">Penjemputan berikutnya</p>
            <p className="font-semibold text-gray-800 text-sm">Senin, 28 April 2026</p>
            <p className="text-xs text-green-600 mt-0.5">✓ Pisahkan organik &amp; anorganik</p>
          </div>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">Aktif</span>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="px-4 mt-5">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Fitur Utama</p>
        <div className="flex flex-col gap-3">
          {features.map((f) => (
            <Link key={f.href} href={f.href}>
              <div className={`border rounded-2xl p-4 flex items-center gap-4 ${f.color} pressable`}>
                <div className={`w-12 h-12 ${f.iconBg} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
                  {f.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800">{f.title}</p>
                    {f.badge && (
                      <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">{f.badge}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{f.desc}</p>
                </div>
                <span className="text-gray-300 text-xl">›</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tips Banner */}
      <div className="mx-4 mt-4 mb-4 bg-green-600 rounded-2xl p-4">
        <p className="text-green-200 text-xs mb-1">💡 Tips</p>
        <p className="text-white text-sm font-medium">
          1 kg sampah daur ulang = 10 poin. Kumpulkan 100 poin untuk naik level dan menangkan hadiah!
        </p>
      </div>
    </div>
  )
}