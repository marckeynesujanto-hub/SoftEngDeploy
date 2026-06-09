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

type OrderStatus = 'waiting' | 'driver_found' | 'pickup' | 'arrived' | 'collecting' | 'to_tps' | 'done'

const STATUS_STEPS: { status: OrderStatus; label: string; desc: string; icon: string }[] = [
  { status: 'waiting',      label: 'Mencari Driver',     desc: 'Sedang mencarikan driver terdekat...',     icon: '🔍' },
  { status: 'driver_found', label: 'Driver Ditemukan',   desc: 'Driver sedang bersiap menuju lokasi Anda', icon: '🏍️' },
  { status: 'pickup',       label: 'Driver Menuju Anda', desc: 'Driver sedang dalam perjalanan ke lokasi', icon: '🛵' },
  { status: 'arrived',      label: 'Driver Tiba',        desc: 'Driver sudah tiba di lokasi Anda!',        icon: '📍' },
  { status: 'collecting',   label: 'Mengambil Sampah',   desc: 'Driver sedang mengambil sampah Anda',      icon: '🗑️' },
  { status: 'to_tps',       label: 'Menuju TPS',         desc: 'Sampah dibawa ke TPS terdekat',            icon: '🚛' },
  { status: 'done',         label: 'Selesai!',           desc: 'Sampah berhasil dibuang ke TPS. Terima kasih!', icon: '✅' },
]

interface Driver {
  name: string
  phone: string
  vehicle: string
  rating: string
}

interface NearestTPS {
  id: string
  name: string
  lat: number
  lon: number
  address: string
  distance: number
}

interface UserLocation {
  lat: number
  lon: number
}

export default function TrackingPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<any>(null)
  const driverMarkerRef = useRef<any>(null)
  const routeLineRef = useRef<any>(null)

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [status, setStatus] = useState<OrderStatus>('waiting')
  const [nearestTPS, setNearestTPS] = useState<NearestTPS | null>(null)
  const [driver, setDriver] = useState<Driver>({
    name: 'Mencari driver...',
    phone: '',
    vehicle: '',
    rating: '4.9',
  })
  const [eta, setEta] = useState<number>(8)
  const [showRating, setShowRating] = useState(false)
  const [rating, setRating] = useState(0)
  const [mapReady, setMapReady] = useState(false)
  const animRef = useRef<NodeJS.Timeout | null>(null)
  const simulationStarted = useRef(false)

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
      getUserLocation()
    }
    load().catch(console.error)
    return () => { if (animRef.current) clearTimeout(animRef.current) }
  }, [])

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      const fb = { lat: -6.2088, lon: 106.8456 }
      setUserLocation(fb); initMap(fb); return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        setUserLocation(loc); initMap(loc)
      },
      () => {
        const fb = { lat: -6.2088, lon: 106.8456 }
        setUserLocation(fb); initMap(fb)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const initMap = (loc: UserLocation) => {
    if (!mapRef.current || leafletMap.current) return
    const L = (window as any).L
    const map = L.map(mapRef.current, { center: [loc.lat, loc.lon], zoom: 14, zoomControl: false })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(map)
    L.control.zoom({ position: 'bottomright' }).addTo(map)
    const userIcon = L.divIcon({
      html: `<div style="background:#16a34a;width:36px;height:36px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🏠</div>`,
      className: '', iconSize: [36, 36], iconAnchor: [18, 18],
    })
    L.marker([loc.lat, loc.lon], { icon: userIcon }).addTo(map).bindPopup('<b>📍 Lokasi Anda</b>')
    leafletMap.current = map
    setMapReady(true)
    setUserLocation(loc)
  }

  useEffect(() => {
    if (!mapReady || !userLocation || simulationStarted.current) return
    simulationStarted.current = true
    startFlow(userLocation)
  }, [mapReady, userLocation])

  const fetchNearestTPS = async (lat: number, lon: number): Promise<NearestTPS | null> => {
    try {
      const res = await fetch(`/api/locations?lat=${lat}&lon=${lon}&radius=5000`)
      const data = await res.json()
      if (data && data.length > 0) {
        return { id: data[0].id, name: data[0].name, lat: data[0].lat, lon: data[0].lon, address: data[0].address, distance: data[0].distance }
      }
    } catch { }
    return null
  }

  const fetchRandomDriver = async (): Promise<Driver> => {
    try {
      const res = await fetch('/api/drivers')
      const data = await res.json()
      return data
    } catch {
      return { name: 'Budi Santoso', phone: '081234567890', vehicle: 'Honda Vario · B 4521 XYZ', rating: '4.9' }
    }
  }

  const startFlow = async (userLoc: UserLocation) => {
    const L = (window as any).L
    const map = leafletMap.current

    // Fetch driver dan TPS secara paralel
    const [randomDriver, tpsPromise] = await Promise.all([
      fetchRandomDriver(),
      Promise.resolve(fetchNearestTPS(userLoc.lat, userLoc.lon)),
    ])
    setDriver(randomDriver)

    await delay(2500)
    setStatus('driver_found')

    const startPos: [number, number] = [userLoc.lat - 0.015, userLoc.lon + 0.012]
    addDriverMarker(startPos, randomDriver.name, randomDriver.vehicle)

    await delay(2000)
    setStatus('pickup')

    const routeToUser = generateRoute(startPos, [userLoc.lat, userLoc.lon], 30)
    await animateDriver(routeToUser, 300, remaining => {
      setEta(Math.max(1, Math.round((remaining / 30) * 8)))
    })

    setStatus('arrived')
    setEta(0)
    map?.flyTo([userLoc.lat, userLoc.lon], 16, { duration: 1 })
    await delay(3000)

    setStatus('collecting')

    const tps = await tpsPromise
    setNearestTPS(tps)

    if (tps && map && L) {
      const tpsIcon = L.divIcon({
        html: `<div style="background:#dc2626;width:36px;height:36px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🗑️</div>`,
        className: '', iconSize: [36, 36], iconAnchor: [18, 18],
      })
      L.marker([tps.lat, tps.lon], { icon: tpsIcon }).addTo(map)
        .bindPopup(`<b>🗑️ ${tps.name}</b><br>${tps.address}`)
    }

    await delay(3000)
    setStatus('to_tps')
    setEta(5)

    const tpsLoc: [number, number] = tps
      ? [tps.lat, tps.lon]
      : [userLoc.lat + 0.018, userLoc.lon - 0.014]

    const routeToTPS = generateRoute([userLoc.lat, userLoc.lon], tpsLoc, 30)
    await animateDriver(routeToTPS, 300, remaining => {
      setEta(Math.max(1, Math.round((remaining / 30) * 5)))
    })

    map?.flyTo(tpsLoc, 16, { duration: 1 })
    setStatus('done')
    setEta(0)
    setTimeout(() => setShowRating(true), 1500)
  }

  function delay(ms: number) {
    return new Promise<void>(res => { animRef.current = setTimeout(res, ms) })
  }

  function addDriverMarker(pos: [number, number], name: string, vehicle: string) {
    const L = (window as any).L
    const map = leafletMap.current
    if (!map || !L) return
    if (driverMarkerRef.current) map.removeLayer(driverMarkerRef.current)
    const icon = L.divIcon({
      html: `<div style="background:#f59e0b;width:40px;height:40px;border-radius:50%;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 10px rgba(0,0,0,0.4);">🛵</div>`,
      className: '', iconSize: [40, 40], iconAnchor: [20, 20],
    })
    driverMarkerRef.current = L.marker(pos, { icon }).addTo(map)
      .bindPopup(`<b>🛵 ${name}</b><br>${vehicle}`)
  }

  async function animateDriver(route: [number, number][], stepMs: number, onStep?: (remaining: number) => void) {
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
    if (routeLineRef.current) { map.removeLayer(routeLineRef.current); routeLineRef.current = null }
  }

  const currentStep = STATUS_STEPS.find(s => s.status === status) || STATUS_STEPS[0]
  const stepIndex = STATUS_STEPS.findIndex(s => s.status === status)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-green-600 px-5 pt-14 pb-5 rounded-b-3xl flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
            {currentStep.icon}
          </div>
          <div>
            <h1 className="text-white text-lg font-bold">{currentStep.label}</h1>
            <p className="text-green-100 text-xs mt-0.5">{currentStep.desc}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-1">
          {STATUS_STEPS.map((s, i) => (
            <div key={s.status}
              className={`flex-1 h-1.5 rounded-full transition-all duration-500
                ${i <= stepIndex ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      {/* TPS Info */}
      {status === 'to_tps' && nearestTPS && (
        <div className="mx-4 mt-4 bg-red-50 rounded-2xl p-4 border border-red-200 shadow-sm flex items-center gap-3">
          <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center text-2xl">🗑️</div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800 text-sm">{nearestTPS.name}</p>
            <p className="text-xs text-gray-400 truncate">📍 {nearestTPS.address}</p>
            <p className="text-xs text-red-600 font-semibold mt-0.5">
              {nearestTPS.distance < 1
                ? `${Math.round(nearestTPS.distance * 1000)} m dari lokasi Anda`
                : `${nearestTPS.distance.toFixed(1)} km dari lokasi Anda`}
            </p>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden shadow-lg flex-shrink-0" style={{ height: '280px' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Map legend */}
      <div className="mx-4 mt-2 flex gap-3 text-xs text-gray-500 flex-wrap">
        <span>🏠 Lokasi Anda</span>
        <span>🛵 Driver</span>
        {nearestTPS && <span>🗑️ {nearestTPS.name}</span>}
      </div>

      {/* ETA */}
      {status !== 'done' && status !== 'waiting' && (
        <div className="mx-4 mt-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-xl">⏱️</div>
          <div className="flex-1">
            <p className="text-xs text-gray-400">
              {status === 'to_tps' ? `Estimasi tiba di ${nearestTPS?.name || 'TPS'}` : 'Estimasi tiba di lokasi Anda'}
            </p>
            <p className="font-bold text-gray-800 text-lg">
              {eta === 0 ? 'Sudah tiba!' : `${eta} menit lagi`}
            </p>
          </div>
        </div>
      )}

      {/* Driver info */}
      {status !== 'waiting' && status !== 'done' && (
        <div className="mx-4 mt-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl">👨</div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{driver.name}</p>
              <p className="text-xs text-gray-400">{driver.vehicle}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-yellow-400 text-xs">⭐</span>
                <span className="text-xs font-semibold text-gray-700">{driver.rating}</span>
              </div>
            </div>
            {driver.phone && (
              <a href={`tel:${driver.phone}`}
                className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl pressable">
                📞
              </a>
            )}
          </div>
        </div>
      )}

      {/* Waiting */}
      {status === 'waiting' && (
        <div className="mx-4 mt-3 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center">
          <div className="flex justify-center gap-2 mb-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-3 h-3 bg-green-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
          <p className="text-gray-600 font-medium">Mencari driver terdekat...</p>
          <p className="text-gray-400 text-sm mt-1">Mohon tunggu sebentar</p>
        </div>
      )}

      {/* Status timeline */}
      <div className="mx-4 mt-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Status Order</p>
        <div className="flex flex-col">
          {STATUS_STEPS.map((s, i) => {
            const done = i < stepIndex
            const active = i === stepIndex
            return (
              <div key={s.status} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                    ${done ? 'bg-green-500 border-green-500 text-white'
                      : active ? 'bg-green-600 border-green-600 text-white scale-110'
                      : 'bg-white border-gray-200 text-gray-300'}`}>
                    {done ? '✓' : s.icon}
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`w-0.5 h-5 ${done ? 'bg-green-400' : 'bg-gray-100'}`} />
                  )}
                </div>
                <div className="flex-1 pb-1">
                  <p className={`text-sm font-medium
                    ${active ? 'text-green-600' : done ? 'text-gray-700' : 'text-gray-300'}`}>
                    {s.label}
                    {s.status === 'to_tps' && nearestTPS && active && (
                      <span className="text-xs text-gray-400 ml-1">→ {nearestTPS.name}</span>
                    )}
                  </p>
                  {active && <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Done */}
      {status === 'done' && (
        <div className="mx-4 mb-4 bg-green-50 rounded-2xl p-4 border border-green-200 text-center">
          <p className="text-3xl mb-2">🎉</p>
          <p className="font-bold text-green-800">Sampah berhasil dibuang!</p>
          {nearestTPS && <p className="text-green-600 text-xs mt-1">Dibuang ke {nearestTPS.name}</p>}
          <p className="text-green-600 text-sm mt-1">+10 poin telah ditambahkan ke akun Anda</p>
        </div>
      )}

      {/* Rating modal */}
      {showRating && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50">
          <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl p-6">
            <p className="text-center text-2xl mb-1">🛵</p>
            <h3 className="font-bold text-gray-800 text-lg text-center mb-1">Beri Rating Driver</h3>
            <p className="text-gray-400 text-sm text-center mb-2">{driver.name}</p>
            <p className="text-gray-400 text-sm text-center mb-5">Bagaimana pelayanannya?</p>
            <div className="flex justify-center gap-3 mb-5">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setRating(star)}
                  className={`text-4xl pressable transition-all ${star <= rating ? 'scale-110' : 'opacity-30'}`}>
                  ⭐
                </button>
              ))}
            </div>
            <button onClick={() => setShowRating(false)} disabled={rating === 0}
              className="w-full bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 text-white py-3.5 rounded-2xl font-bold pressable">
              Kirim Rating
            </button>
            <button onClick={() => setShowRating(false)} className="w-full mt-2 text-gray-400 text-sm py-2">
              Lewati
            </button>
          </div>
        </div>
      )}
    </div>
  )
}