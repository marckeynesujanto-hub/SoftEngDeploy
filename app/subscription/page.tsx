'use client'

import { useState, useEffect } from 'react'

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

const PACKAGES = [
  { id: 'mingguan', label: 'Mingguan', price: 'Rp 79.000', per: '/bulan', desc: '4× penjemputan', icon: '📦', popular: false },
  { id: 'bulanan',  label: 'Bulanan',  price: 'Rp 149.000', per: '/bulan', desc: 'Hari pilihan', icon: '🚀', popular: true },
]

const PAYMENT_METHODS = [
  { id: 'gopay',    label: 'GoPay',            icon: '💚' },
  { id: 'ovo',      label: 'OVO',              icon: '💜' },
  { id: 'dana',     label: 'DANA',             icon: '💙' },
  { id: 'transfer', label: 'Transfer Bank',     icon: '🏦' },
  { id: 'card',     label: 'Kartu Kredit/Debit',icon: '💳' },
]

interface PickupHistory {
  tanggal: string
  hari: string
  status: 'Selesai' | 'Terjadwal' | 'Dibatalkan'
  petugas?: string
  rating?: number
}

interface Subscription {
  id: number
  paket: string
  jadwal: string[]
  isPaused: boolean
  riwayat: PickupHistory[]
}

export default function SubscriptionPage() {
  const [tab, setTab] = useState<'baru' | 'aktif' | 'riwayat'>('baru')
  const [paket, setPaket] = useState<'mingguan' | 'bulanan'>('mingguan')
  const [jadwal, setJadwal] = useState<string[]>([])
  const [paymentMethod, setPaymentMethod] = useState('gopay')
  const [isPaused, setIsPaused] = useState(false)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [ratingModal, setRatingModal] = useState<{ index: number } | null>(null)

  useEffect(() => {
    fetch('/api/subscription')
      .then(r => r.json())
      .then(setSubscriptions)
      .catch(() => {})
  }, [])

  const toggleDay = (day: string) => {
    setJadwal(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleSubmit = async () => {
  if (jadwal.length === 0) return alert('Pilih minimal 1 hari penjemputan')
  
  const userId = localStorage.getItem('user_id'); 
  console.log("DEBUG: Mengirim user_id =", userId);
  
  setLoading(true)
  try {
    const res = await fetch('/api/subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paket, jadwal, isPaused, paymentMethod, user_id: userId }),
    })
    
    if (res.ok) {
      
      await fetch('/api/points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action: 'subscription' }),
      });
   

      const data = await res.json()
      setSubscriptions(prev => [...prev, data])
      setSuccess(true)
      setTab('aktif')
    }
  } catch (err) {
    console.error(err)
  } finally {
    setLoading(false)
  }
}

  const activeSub = subscriptions[0]
  const allHistory = subscriptions.flatMap(s => s.riwayat)

  if (success && tab === 'aktif') {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-green-600 px-5 pt-14 pb-6 rounded-b-3xl">
          <h1 className="text-white text-xl font-bold">Langganan Jemput Sampah</h1>
        </div>
        <div className="px-4 mt-6 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Pembayaran Berhasil!</h2>
          <p className="text-gray-500 text-sm mb-6">Jadwal penjemputan telah dibuat otomatis. Notifikasi akan dikirim sehari sebelum penjemputan.</p>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 text-left mb-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Paket</span>
              <span className="text-sm font-semibold capitalize text-gray-800">{paket}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-gray-500">Hari Jemput</span>
              <span className="text-sm font-semibold text-gray-800">{jadwal.join(', ')}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-500">Pembayaran</span>
              <span className="text-sm font-semibold text-gray-800 uppercase">{paymentMethod}</span>
            </div>
          </div>
          <button
            onClick={() => { setSuccess(false); setTab('aktif') }}
            className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold"
          >
            Lihat Langganan Saya
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 px-5 pt-14 pb-6 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Langganan Jemput Sampah</h1>
        <p className="text-green-100 text-sm mt-1">Atur jadwal, kami yang jemput 🚛</p>
      </div>

      {/* Tabs */}
      <div className="flex mx-4 mt-4 bg-gray-200 rounded-xl p-1 gap-1">
        {(['baru', 'aktif', 'riwayat'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all
              ${tab === t ? 'bg-white text-green-700 shadow-sm' : 'text-gray-500'}`}
          >
            {t === 'baru' ? '+ Baru' : t === 'aktif' ? '✓ Aktif' : '📋 Riwayat'}
          </button>
        ))}
      </div>

      {/* ───── TAB: BARU ───── */}
      {tab === 'baru' && (
        <div className="px-4 mt-4 flex flex-col gap-5 pb-6">

          {/* Package */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Pilih Paket</p>
            <div className="flex gap-3">
              {PACKAGES.map(pkg => (
                <button
                  key={pkg.id}
                  onClick={() => setPaket(pkg.id as 'mingguan' | 'bulanan')}
                  className={`flex-1 relative border-2 rounded-2xl p-3 text-left transition-all
                    ${paket === pkg.id ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2 right-3 text-xs bg-orange-400 text-white px-2 py-0.5 rounded-full font-semibold">
                      Populer
                    </span>
                  )}
                  <span className="text-2xl">{pkg.icon}</span>
                  <p className="font-semibold text-gray-800 text-sm mt-1">{pkg.label}</p>
                  <p className="text-green-600 text-sm font-bold">{pkg.price}<span className="text-xs font-normal text-gray-400">{pkg.per}</span></p>
                  <p className="text-gray-400 text-xs mt-0.5">{pkg.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Day Picker */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Pilih Hari Penjemputan</p>
            <div className="grid grid-cols-4 gap-2">
              {DAYS.map(day => (
                <button
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`py-2.5 rounded-xl text-xs font-semibold border-2 transition-all pressable
                    ${jadwal.includes(day)
                      ? 'bg-green-500 border-green-500 text-white shadow-md shadow-green-200'
                      : 'bg-white border-gray-200 text-gray-600'}`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              ℹ️ Jadwal dapat diubah maksimal H-1 sebelum penjemputan
            </p>
          </div>

          {/* Waste Separation Guide */}
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
            <p className="text-sm font-semibold text-blue-800 mb-3">🗑️ Panduan Pemisahan Sampah</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-xl p-3 text-center">
                <p className="text-2xl mb-1">🥬</p>
                <p className="text-xs font-semibold text-gray-700">Organik</p>
                <p className="text-xs text-gray-400">Sisa makanan, daun</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center">
                <p className="text-2xl mb-1">🥤</p>
                <p className="text-xs font-semibold text-gray-700">Anorganik</p>
                <p className="text-xs text-gray-400">Plastik, kertas, logam</p>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Metode Pembayaran</p>
            <div className="flex flex-col gap-2">
              {PAYMENT_METHODS.map(m => (
                <label
                  key={m.id}
                  className={`flex items-center gap-3 rounded-xl p-3 border-2 cursor-pointer transition-all
                    ${paymentMethod === m.id ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={m.id}
                    checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id)}
                    className="accent-green-600"
                  />
                  <span className="text-xl">{m.icon}</span>
                  <span className="text-sm text-gray-700 font-medium">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Summary + CTA */}
          {jadwal.length > 0 && (
            <div className="bg-gray-100 rounded-2xl p-4 text-sm">
              <p className="font-semibold text-gray-700 mb-2">Ringkasan Pesanan</p>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Paket</span>
                <span className="font-medium capitalize">{paket}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500">Hari jemput</span>
                <span className="font-medium">{jadwal.join(', ')}</span>
              </div>
              <div className="flex justify-between py-1 border-t border-gray-200 mt-1 pt-2">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-green-600">{paket === 'mingguan' ? 'Rp 79.000' : 'Rp 149.000'}/bln</span>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || jadwal.length === 0}
            className="w-full bg-green-600 disabled:bg-gray-300 disabled:shadow-none text-white py-4 rounded-2xl font-bold text-base shadow-lg shadow-green-200 pressable transition-all"
          >
            {loading ? '⏳ Memproses...' : '✓ Konfirmasi & Bayar'}
          </button>
        </div>
      )}

      {/* ───── TAB: AKTIF ───── */}
      {tab === 'aktif' && (
        <div className="px-4 mt-4 flex flex-col gap-4 pb-6">
          {activeSub ? (
            <>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-800 capitalize">Paket {activeSub.paket}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{activeSub.jadwal.join(', ')}</p>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold
                    ${isPaused ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-700'}`}>
                    {isPaused ? 'Dijeda' : 'Aktif'}
                  </span>
                </div>

                {isPaused && (
                  <div className="bg-orange-50 rounded-xl p-3 mb-3 border border-orange-100">
                    <p className="text-xs text-orange-600">⚠️ Layanan sedang dijeda. Tidak ada penjemputan sampai diaktifkan kembali.</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all pressable
                      ${isPaused ? 'bg-green-600 text-white' : 'bg-orange-100 text-orange-600'}`}
                  >
                    {isPaused ? '▶ Aktifkan Kembali' : '⏸ Jeda Sementara'}
                  </button>
                  <button className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm font-semibold pressable">
                    ✏️ Ubah Jadwal
                  </button>
                </div>
              </div>

              {/* Upcoming pickups */}
              <div>
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-2">Jadwal Mendatang</p>
                {activeSub.jadwal.map((hari, i) => (
                  <div key={hari} className="bg-white rounded-2xl p-4 border border-gray-100 mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-lg">🚛</div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">Setiap {hari}</p>
                      <p className="text-xs text-gray-400">Penjemputan rutin</p>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Terjadwal</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">📭</p>
              <p className="text-gray-500 font-medium">Belum ada langganan aktif</p>
              <button
                onClick={() => setTab('baru')}
                className="mt-4 bg-green-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm pressable"
              >
                + Buat Langganan
              </button>
            </div>
          )}
        </div>
      )}

      {/* ───── TAB: RIWAYAT ───── */}
      {tab === 'riwayat' && (
        <div className="px-4 mt-4 pb-6">
          {allHistory.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">📋</p>
              <p className="text-gray-500">Belum ada riwayat penjemputan</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {allHistory.map((item, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg
                      ${item.status === 'Selesai' ? 'bg-green-100' : item.status === 'Dibatalkan' ? 'bg-red-100' : 'bg-blue-100'}`}>
                      {item.status === 'Selesai' ? '✅' : item.status === 'Dibatalkan' ? '❌' : '🕒'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{item.tanggal}</p>
                      <p className="text-xs text-gray-400">{item.hari} · {item.petugas || 'Petugas TrashAway'}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium
                        ${item.status === 'Selesai' ? 'bg-green-100 text-green-700'
                          : item.status === 'Dibatalkan' ? 'bg-red-100 text-red-600'
                          : 'bg-blue-100 text-blue-600'}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                  {item.status === 'Selesai' && !item.rating && (
                    <button
                      onClick={() => setRatingModal({ index: i })}
                      className="mt-3 w-full bg-gray-50 border border-gray-200 text-gray-600 py-2 rounded-xl text-xs font-medium pressable"
                    >
                      ⭐ Beri Rating Petugas
                    </button>
                  )}
                  {item.rating && (
                    <div className="mt-2 flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className={`text-sm ${i < item.rating! ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rating Modal */}
      {ratingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setRatingModal(null)}>
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 text-lg mb-1 text-center">Beri Rating Petugas</h3>
            <p className="text-gray-400 text-sm text-center mb-5">Bagaimana pelayanan petugas hari ini?</p>
            <div className="flex justify-center gap-3 mb-5">
              {[1,2,3,4,5].map(star => (
                <button key={star} className="text-4xl text-yellow-400 pressable">★</button>
              ))}
            </div>
            <button
              onClick={() => setRatingModal(null)}
              className="w-full bg-green-600 text-white py-3.5 rounded-2xl font-bold pressable"
            >
              Kirim Rating
            </button>
          </div>
        </div>
      )}
    </div>
  )
}