'use client'

import { useEffect, useRef, useState } from 'react'

function generateRoute(from: [number, number], to: [number, number], steps = 20): [number, number][] {
  const route: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const noise = Math.sin(t * Math.PI) * 0.002
    route.push([
      from[0] + (to[0] - from[0]) * t + noise,
      from[1] + (to[1] - from[1]) * t + noise * 0.5,
    ])
  }
  return route
}

type OrderStatus =
  | 'confirmed'     // Order dikonfirmasi
  | 'driver_found'  // Driver ditemukan
  | 'to_seller'     // Driver menuju penjual
  | 'at_seller'     // Driver tiba di penjual
  | 'picking_up'    // Mengambil sampah dari penjual
  | 'to_buyer'      // Driver menuju pembeli
  | 'arrived'       // Driver tiba di pembeli
  | 'done'          // Selesai

const STATUS_STEPS: {
  status: OrderStatus
  label: string
  desc: string
  icon: string
}[] = [
  { status: 'confirmed',    label: 'Pesanan Dikonfirmasi', desc: 'Pesananmu sedang diproses',                    icon: '✅' },
  { status: 'driver_found', label: 'Driver Ditemukan',     desc: 'Driver sedang menuju lokasi penjual',          icon: '🏍️' },
  { status: 'to_seller',    label: 'Menuju Penjual',       desc: 'Driver dalam perjalanan ke lokasi penjual',    icon: '🛵' },
  { status: 'at_seller',    label: 'Tiba di Penjual',      desc: 'Driver sudah tiba di lokasi penjual',          icon: '📍' },
  { status: 'picking_up',   label: 'Mengambil Sampah',     desc: 'Driver sedang mengambil sampah dari penjual',  icon: '📦' },
  { status: 'to_buyer',     label: 'Menuju Kamu',          desc: 'Sampah sedang diantarkan ke lokasimu',         icon: '🚛' },
  { status: 'arrived',      label: 'Tiba di Lokasimu',     desc: 'Driver sudah tiba! Siapkan pembayaran',        icon: '🏠' },
  { status: 'done',         label: 'Selesai!',             desc: 'Sampah berhasil diterima. Terima kasih!',      icon: '🎉' },
]

const DRIVER = {
  name: 'Rudi Hartono',
  vehicle: 'Honda Beat · B 1234 ABC',
  rating: 4.8,
  phone: '+62 813-9876-5432',
}

const ORDER_INFO = {
  product: 'Kardus Bekas',
  category: 'Kardus',
  weight: '10 kg',
  price: 'Rp 20.000',
  seller: 'Pak Budi',
  sellerArea: 'Jakarta Selatan',
}

export default function TrackingOrderPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<any>(null)
  const driverMarkerRef = useRef<any>(null)
  const routeLineRef = useRef<any>(null)

  const [status, setStatus] = useState<OrderStatus>('confirmed')
  const [userLocation] = useState<[number, number]>([-6.2088, 106.8456])
  // Seller is ~1.5km from buyer
  const [sellerLocation] = useState<[number, number]>([-6.2297, 106.8258])
  const [eta, setEta] = useState<number>(12)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [ratingMessage, setRatingMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const animRef = useRef<NodeJS.Timeout | null>(null)

  // Debug: Check Supabase config on mount
  useEffect(() => {
    console.log('🚀 [TrackingOrderPage] Component mounted')
    console.log('🔧 [Supabase] Config check:')
    console.log('  - URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set')
    console.log('  - Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set')
  }, [])

  // Get current user from localStorage (like subscription does)
  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id')
    console.log('📦 [localStorage] user_id:', storedUserId)
    
    if (storedUserId) {
      console.log('✅ User loaded from localStorage:', storedUserId)
      setUserId(storedUserId)
    } else {
      console.warn('⚠️ No user_id in localStorage. User might not be logged in.')
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const load = async () => {
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link')
        link.id = 'leaflet-css'; link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
        document.head.appendChild(link)
      }
      if (!(window as any).L) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement('script')
          s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
          s.onload = () => res(); s.onerror = rej
          document.head.appendChild(s)
        })
      }
      setMapLoaded(true)
    }
    load().catch(console.error)
  }, [])

  useEffect(() => {
    if (!mapLoaded) return
    initMap()
    runSimulation()
    return () => { if (animRef.current) clearTimeout(animRef.current) }
  }, [mapLoaded])

  const initMap = () => {
    if (!mapRef.current || leafletMap.current) return
    const L = (window as any).L

    // Center between seller and buyer
    const centerLat = (userLocation[0] + sellerLocation[0]) / 2
    const centerLon = (userLocation[1] + sellerLocation[1]) / 2

    const map = L.map(mapRef.current, {
      center: [centerLat, centerLon],
      zoom: 13,
      zoomControl: false,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Buyer marker (home)
    const buyerIcon = L.divIcon({
      html: `<div style="background:#16a34a;width:36px;height:36px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🏠</div>`,
      className: '', iconSize: [36, 36], iconAnchor: [18, 18],
    })
    L.marker(userLocation, { icon: buyerIcon }).addTo(map).bindPopup('<b>🏠 Lokasi Anda (Pembeli)</b>')

    // Seller marker
    const sellerIcon = L.divIcon({
      html: `<div style="background:#0891b2;width:36px;height:36px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">📦</div>`,
      className: '', iconSize: [36, 36], iconAnchor: [18, 18],
    })
    L.marker(sellerLocation, { icon: sellerIcon }).addTo(map)
      .bindPopup(`<b>📦 ${ORDER_INFO.seller} (Penjual)</b><br>${ORDER_INFO.sellerArea}`)

    leafletMap.current = map
  }

  function delay(ms: number) {
    return new Promise<void>(res => { animRef.current = setTimeout(res, ms) })
  }

  function addDriverMarker(pos: [number, number]) {
    const L = (window as any).L
    const map = leafletMap.current
    if (!map || !L) return
    if (driverMarkerRef.current) map.removeLayer(driverMarkerRef.current)
    const icon = L.divIcon({
      html: `<div style="background:#f59e0b;width:40px;height:40px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 10px rgba(0,0,0,0.4);">🛵</div>`,
      className: '', iconSize: [40, 40], iconAnchor: [20, 20],
    })
    driverMarkerRef.current = L.marker(pos, { icon }).addTo(map)
      .bindPopup(`<b>🛵 ${DRIVER.name}</b><br>${DRIVER.vehicle}`)
  }

  async function animateDriver(
    route: [number, number][],
    stepMs: number,
    onStep?: (remaining: number) => void
  ) {
    const L = (window as any).L
    const map = leafletMap.current
    if (!map || !L) return

    if (routeLineRef.current) map.removeLayer(routeLineRef.current)
    routeLineRef.current = L.polyline(route, {
      color: '#f59e0b', weight: 4, opacity: 0.7, dashArray: '8,8',
    }).addTo(map)

    for (let i = 0; i < route.length; i++) {
      await delay(stepMs)
      const pos = route[i]
      if (driverMarkerRef.current) driverMarkerRef.current.setLatLng(pos)
      onStep?.(route.length - i)
      if (i % 5 === 0) map.panTo(pos, { animate: true, duration: 0.5 })
    }

    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current)
      routeLineRef.current = null
    }
  }

  const runSimulation = async () => {
    // 1. Confirmed
    await delay(2000)

    // 2. Driver found — starts far from seller
    const driverStart: [number, number] = [sellerLocation[0] - 0.018, sellerLocation[1] + 0.015]
    setStatus('driver_found')
    addDriverMarker(driverStart)
    await delay(2000)

    // 3. Driver → Seller
    setStatus('to_seller')
    setEta(8)
    const routeToSeller = generateRoute(driverStart, sellerLocation, 25)
    await animateDriver(routeToSeller, 280, remaining => {
      setEta(Math.max(1, Math.round((remaining / 25) * 8)))
    })

    // 4. At seller
    setStatus('at_seller')
    setEta(0)
    leafletMap.current?.flyTo(sellerLocation, 16, { duration: 1 })
    await delay(2500)

    // 5. Picking up
    setStatus('picking_up')
    await delay(3000)

    // 6. Driver → Buyer
    setStatus('to_buyer')
    setEta(7)
    const routeToBuyer = generateRoute(sellerLocation, userLocation, 25)
    await animateDriver(routeToBuyer, 280, remaining => {
      setEta(Math.max(1, Math.round((remaining / 25) * 7)))
    })

    // 7. Arrived at buyer
    setStatus('arrived')
    setEta(0)
    leafletMap.current?.flyTo(userLocation, 16, { duration: 1 })
    await delay(3000)

    // 8. Done
    setStatus('done')
    setTimeout(() => setShowRating(true), 1500)
  }

  const currentStep = STATUS_STEPS.find(s => s.status === status) || STATUS_STEPS[0]
  const stepIndex = STATUS_STEPS.findIndex(s => s.status === status)

  const handleSubmitRating = async () => {
    console.log('📤 Submit Rating - userId:', userId, 'rating:', rating)
    
    if (!rating) {
      setRatingMessage({ type: 'error', text: '⭐ Silakan pilih rating terlebih dahulu' })
      return
    }

    if (!userId) {
      console.error('❌ CRITICAL: userId is null/undefined')
      setRatingMessage({ 
        type: 'error', 
        text: '❌ User tidak terautentikasi. Silakan logout dan login kembali.' 
      })
      return
    }

    setIsSubmitting(true)
    setRatingMessage(null)

    try {
      console.log('🔄 Sending request to /api/ratings with:', { user_id: userId, rating, comment })
      
      const response = await fetch('/api/ratings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          rating,
          comment: comment || null,
        }),
      })

      const data = await response.json()
      console.log('📥 API Response:', { status: response.status, data })

      if (!response.ok) {
        const errorMsg = data.error || `HTTP ${response.status}`
        throw new Error(errorMsg)
      }

      setRatingMessage({ type: 'success', text: '✅ Rating berhasil disimpan! +2 poin ditambahkan.' })
      setTimeout(() => {
        setShowRating(false)
        setRating(0)
        setComment('')
        setRatingMessage(null)
      }, 1500)
    } catch (error) {
      console.error('❌ Error submitting rating:', error)
      const errorText = error instanceof Error ? error.message : 'Terjadi kesalahan server'
      setRatingMessage({
        type: 'error',
        text: `❌ ${errorText}`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-teal-600 px-5 pt-14 pb-5 rounded-b-3xl flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
            {currentStep.icon}
          </div>
          <div>
            <h1 className="text-white text-lg font-bold">{currentStep.label}</h1>
            <p className="text-teal-100 text-xs mt-0.5">{currentStep.desc}</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 flex gap-1">
          {STATUS_STEPS.map((s, i) => (
            <div key={s.status}
              className={`flex-1 h-1.5 rounded-full transition-all duration-500
                ${i <= stepIndex ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      {/* Order Info Card */}
      <div className="mx-4 mt-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
        <div className="w-11 h-11 bg-teal-50 rounded-xl flex items-center justify-center text-2xl">📦</div>
        <div className="flex-1">
          <p className="font-semibold text-gray-800 text-sm">{ORDER_INFO.product}</p>
          <p className="text-xs text-gray-400">{ORDER_INFO.weight} · {ORDER_INFO.category}</p>
          <p className="text-xs text-teal-600 font-semibold mt-0.5">{ORDER_INFO.price}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Dari</p>
          <p className="text-xs font-semibold text-gray-700">{ORDER_INFO.seller}</p>
          <p className="text-xs text-gray-400">{ORDER_INFO.sellerArea}</p>
        </div>
      </div>

      {/* Map */}
      <div className="mx-4 mt-3 rounded-2xl overflow-hidden shadow-lg flex-shrink-0" style={{ height: 240 }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {!mapLoaded && (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Map Legend */}
      {mapLoaded && (
        <div className="mx-4 mt-2 flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">🏠 Lokasi Anda</span>
          <span className="flex items-center gap-1">📦 Penjual</span>
          <span className="flex items-center gap-1">🛵 Driver</span>
        </div>
      )}

      {/* ETA Card */}
      {!['confirmed', 'done', 'arrived'].includes(status) && (
        <div className="mx-4 mt-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-xl">⏱️</div>
          <div className="flex-1">
            <p className="text-xs text-gray-400">
              {['to_seller', 'at_seller', 'picking_up'].includes(status)
                ? 'Estimasi driver tiba di penjual'
                : 'Estimasi tiba di lokasimu'}
            </p>
            <p className="font-bold text-gray-800 text-lg">
              {eta === 0 ? 'Sudah tiba!' : `${eta} menit lagi`}
            </p>
          </div>
        </div>
      )}

      {/* Driver Info */}
      {!['confirmed', 'done'].includes(status) && (
        <div className="mx-4 mt-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">👨</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{DRIVER.name}</p>
              <p className="text-xs text-gray-400">{DRIVER.vehicle}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-yellow-400 text-xs">⭐</span>
                <span className="text-xs font-semibold text-gray-700">{DRIVER.rating}</span>
              </div>
            </div>
            <a href={`tel:${DRIVER.phone}`}
              className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl pressable">
              📞
            </a>
          </div>
        </div>
      )}

      {/* Status Timeline */}
      <div className="mx-4 mt-3 mb-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status Pengiriman</p>
        <div className="flex flex-col">
          {STATUS_STEPS.map((s, i) => {
            const done   = i < stepIndex
            const active = i === stepIndex
            return (
              <div key={s.status} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                    ${done   ? 'bg-teal-500 border-teal-500 text-white'
                      : active ? 'bg-teal-600 border-teal-600 text-white scale-110'
                      : 'bg-white border-gray-200 text-gray-300'}`}>
                    {done ? '✓' : s.icon}
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`w-0.5 h-5 ${done ? 'bg-teal-300' : 'bg-gray-100'}`} />
                  )}
                </div>
                <div className="flex-1 pb-1">
                  <p className={`text-sm font-medium
                    ${active ? 'text-teal-600' : done ? 'text-gray-700' : 'text-gray-300'}`}>
                    {s.label}
                  </p>
                  {active && <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Done state */}
      {status === 'done' && (
        <div className="mx-4 mb-4 bg-teal-50 rounded-2xl p-4 border border-teal-200 text-center">
          <p className="text-3xl mb-2">🎉</p>
          <p className="font-bold text-teal-800">Sampah berhasil diterima!</p>
          <p className="text-teal-600 text-sm mt-1">+{Math.round(parseFloat(ORDER_INFO.weight) * 10)} poin telah ditambahkan ke akun Anda</p>
        </div>
      )}

      {/* Rating Modal */}
      {showRating && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6">
            <p className="text-center text-2xl mb-1">🛵</p>
            <h3 className="font-bold text-gray-800 text-lg text-center mb-1">Beri Rating Driver</h3>
            <p className="text-gray-400 text-sm text-center mb-5">Bagaimana pelayanan {DRIVER.name}?</p>
            <div className="flex justify-center gap-3 mb-5">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} onClick={() => {
                  console.log('⭐ Clicked star:', star)
                  setRating(star)
                }}
                  disabled={isSubmitting}
                  className={`text-4xl pressable transition-all ${star <= rating ? 'scale-110' : 'opacity-30'} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  ⭐
                </button>
              ))}
            </div>

            {/* Comment Field */}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tambahkan komentar (opsional)"
              disabled={isSubmitting}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-teal-500 mb-4 disabled:opacity-50"
              rows={3}
            />

            {ratingMessage && (
              <div className={`mb-3 p-2 text-sm text-center rounded ${
                ratingMessage.type === 'success'
                  ? 'bg-teal-50 text-teal-700'
                  : 'bg-red-50 text-red-700'
              }`}>
                {ratingMessage.text}
              </div>
            )}
            <button onClick={handleSubmitRating} 
              disabled={rating === 0 || isSubmitting}
              className="w-full bg-teal-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3.5 rounded-2xl font-bold pressable">
              {isSubmitting ? '⏳ Menyimpan...' : 'Kirim Rating'}
            </button>
            <button onClick={() => {
              if (!isSubmitting) {
                setShowRating(false)
                setRating(0)
                setComment('')
                setRatingMessage(null)
              }
            }}
              disabled={isSubmitting}
              className="w-full mt-2 text-gray-400 text-sm py-2">
              Lewati
            </button>
          </div>
        </div>
      )}
    </div>
  )
}