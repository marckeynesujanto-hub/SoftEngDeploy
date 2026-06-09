'use client'

import { useEffect, useRef, useState } from 'react'

interface WasteLocation {
  id: string
  lat: number
  lon: number
  name: string
  type: string
  distance: number
  address: string
}

interface UserLocation {
  lat: number
  lon: number
}

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDistance(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

// Generate dummy TPS locations relative to user position
// Offsets in degrees (~111km per degree lat, ~111km*cos(lat) per degree lon)
const TPS_OFFSETS = [
  // ~300-500m
  { id: 'd1', dLat: 0.0025,  dLon: 0.0018,  name: 'TPS RW 03 Kelurahan Setempat',    type: 'tps',       address: 'Jl. Mawar No. 12' },
  { id: 'd2', dLat: -0.0020, dLon: 0.0030,  name: 'TPS RW 07 Wilayah Setempat',      type: 'tps',       address: 'Jl. Melati Raya No. 5' },
  // ~700m-1km
  { id: 'd3', dLat: 0.0060,  dLon: -0.0045, name: 'TPS Pasar Kecamatan',             type: 'tps',       address: 'Jl. Pasar Lama No. 8' },
  { id: 'd4', dLat: -0.0055, dLon: -0.0050, name: 'Bank Sampah Induk Kecamatan',     type: 'recycling', address: 'Jl. Gotong Royong No. 3' },
  // ~1.5km
  { id: 'd5', dLat: 0.0090,  dLon: 0.0080,  name: 'TPST 3R Kecamatan',              type: 'tpst',      address: 'Jl. Lingkungan Hidup No. 1' },
  { id: 'd6', dLat: -0.0100, dLon: 0.0070,  name: 'TPS Kelurahan Selatan',           type: 'tps',       address: 'Jl. Kenanga Indah No. 22' },
  // ~2km
  { id: 'd7', dLat: 0.0140,  dLon: -0.0100, name: 'TPS Kecamatan Utara',             type: 'tps',       address: 'Jl. Raya Utama No. 45' },
  { id: 'd8', dLat: -0.0130, dLon: -0.0120, name: 'Bank Sampah Unit 03',             type: 'recycling', address: 'Jl. Bersih Asri No. 7' },
  // ~3-5km
  { id: 'd9', dLat: 0.0250,  dLon: 0.0200,  name: 'TPST Kawasan Industri',           type: 'tpst',      address: 'Jl. Industri Hijau No. 100' },
  { id: 'd10', dLat: -0.0300, dLon: 0.0180, name: 'TPA Wilayah Kota',                type: 'tpa',       address: 'Jl. Pembuangan Akhir KM 5' },
  { id: 'd11', dLat: 0.0280,  dLon: -0.0250, name: 'TPS Kelurahan Barat',            type: 'tps',       address: 'Jl. Barat Daya No. 33' },
  { id: 'd12', dLat: -0.0260, dLon: -0.0220, name: 'TPST 3R Wilayah Selatan',        type: 'tpst',      address: 'Jl. Recycle Center No. 2' },
]

const TYPE_INFO: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  tps:       { label: 'TPS',           icon: '🚛', color: '#dc2626', bg: '#fee2e2' },
  tpst:      { label: 'TPST / 3R',    icon: '♻️', color: '#16a34a', bg: '#dcfce7' },
  tpa:       { label: 'TPA',           icon: '🏭', color: '#9333ea', bg: '#f3e8ff' },
  recycling: { label: 'Bank Sampah',   icon: '🏦', color: '#0891b2', bg: '#cffafe' },
  default:   { label: 'Tempat Sampah', icon: '🗑️', color: '#2563eb', bg: '#dbeafe' },
}

function getTypeInfo(t: string) { return TYPE_INFO[t] || TYPE_INFO.default }

const RADIUS_OPTIONS = [500, 1000, 2000, 5000]

function generateDummyLocations(userLat: number, userLon: number, radiusM: number): WasteLocation[] {
  const radiusKm = radiusM / 1000
  return TPS_OFFSETS
    .map(offset => {
      const lat = userLat + offset.dLat
      const lon = userLon + offset.dLon
      const distance = getDistanceKm(userLat, userLon, lat, lon)
      return {
        id: offset.id,
        lat, lon,
        name: offset.name,
        type: offset.type,
        address: offset.address,
        distance,
      }
    })
    .filter(loc => loc.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance)
}

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [locations, setLocations] = useState<WasteLocation[]>([])
  const [selected, setSelected] = useState<WasteLocation | null>(null)
  const [status, setStatus] = useState<'loading' | 'locating' | 'done' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('map')
  const [radius, setRadius] = useState(2000)
  const [filterType, setFilterType] = useState('all')

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
      setStatus('locating')
      getUserLocation()
    }
    load().catch(() => { setStatus('error'); setErrorMsg('Gagal memuat peta.') })
  }, [])

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      const fb = { lat: -6.2088, lon: 106.8456 }
      setUserLocation(fb); initMap(fb); loadLocations(fb, radius); return
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        setUserLocation(loc); initMap(loc); loadLocations(loc, radius)
      },
      () => {
        const fb = { lat: -6.2088, lon: 106.8456 }
        setUserLocation(fb); initMap(fb); loadLocations(fb, radius)
        setErrorMsg('GPS ditolak — menampilkan Jakarta Pusat.')
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
      html: `<div style="width:16px;height:16px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 0 0 6px rgba(37,99,235,0.2);"></div>`,
      className: '', iconSize: [16, 16], iconAnchor: [8, 8],
    })
    L.marker([loc.lat, loc.lon], { icon: userIcon }).addTo(map).bindPopup('<b>📍 Lokasi Anda</b>')
    leafletMap.current = map
  }

  const loadLocations = (loc: UserLocation, r: number) => {
    const results = generateDummyLocations(loc.lat, loc.lon, r)
    setLocations(results)
    addMarkersToMap(results)
    setStatus('done')
  }

  const addMarkersToMap = (locs: WasteLocation[]) => {
    const L = (window as any).L
    const map = leafletMap.current
    if (!map || !L) return
    markersRef.current.forEach(m => map.removeLayer(m))
    markersRef.current = []

    locs.forEach(loc => {
      const info = getTypeInfo(loc.type)
      const icon = L.divIcon({
        html: `<div style="position:relative;width:38px;height:44px;">
          <div style="position:absolute;top:0;left:0;width:34px;height:34px;
            background:${info.color};border-radius:50% 50% 50% 0;transform:rotate(-45deg);
            border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>
          <span style="position:absolute;top:5px;left:5px;font-size:15px;line-height:1;">${info.icon}</span>
        </div>`,
        className: '', iconSize: [38, 44], iconAnchor: [17, 44], popupAnchor: [0, -44],
      })
      const marker = L.marker([loc.lat, loc.lon], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width:185px;font-family:sans-serif;padding:4px 0;">
            <p style="font-weight:700;font-size:13px;margin:0 0 3px;">${info.icon} ${loc.name}</p>
            <span style="display:inline-block;background:${info.bg};color:${info.color};
              font-size:10px;font-weight:600;padding:2px 8px;border-radius:20px;margin-bottom:5px;">
              ${info.label}
            </span>
            <p style="color:#6b7280;font-size:11px;margin:0 0 4px;">📍 ${loc.address}</p>
            <p style="color:#16a34a;font-weight:600;font-size:11px;margin:0 0 8px;">
              🚶 ${formatDistance(loc.distance)} dari Anda
            </p>
            <a href="https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lon}&travelmode=driving"
               target="_blank"
               style="display:block;background:#2563eb;color:white;text-align:center;
                 padding:7px;border-radius:8px;font-size:12px;font-weight:600;text-decoration:none;">
              🧭 Buka Navigasi Google Maps
            </a>
          </div>
        `)
        .on('click', () => setSelected(loc))
      markersRef.current.push(marker)
    })
  }

  const changeRadius = (r: number) => {
    setRadius(r)
    if (userLocation) {
      const results = generateDummyLocations(userLocation.lat, userLocation.lon, r)
      setLocations(results)
      addMarkersToMap(results)
    }
  }

  const flyTo = (loc: WasteLocation) => {
    leafletMap.current?.flyTo([loc.lat, loc.lon], 17, { duration: 1 })
    setSelected(loc); setActiveTab('map')
    setTimeout(() => {
      markersRef.current.find(m =>
        Math.abs(m.getLatLng().lat - loc.lat) < 0.0001
      )?.openPopup()
    }, 1100)
  }

  const filtered = filterType === 'all' ? locations : locations.filter(l => l.type === filterType)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-green-600 px-5 pt-14 pb-4 rounded-b-3xl flex-shrink-0">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-white text-xl font-bold">Peta TPS Terdekat</h1>
            <p className="text-blue-100 text-xs mt-0.5">
              {status === 'locating' && '📡 Mendeteksi lokasi GPS...'}
              {status === 'done' && `✅ ${locations.length} lokasi ditemukan`}
              {status === 'error' && `⚠️ ${errorMsg}`}
              {status === 'loading' && '⏳ Memuat peta...'}
            </p>
          </div>
          <button
            onClick={() => { if (userLocation) leafletMap.current?.flyTo([userLocation.lat, userLocation.lon], 14, { duration: 1 }) }}
            className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl pressable"
          >🎯</button>
        </div>
        <div className="flex gap-2">
          {RADIUS_OPTIONS.map(r => (
            <button key={r} onClick={() => changeRadius(r)}
              className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all pressable
                ${radius === r ? 'bg-white text-blue-700' : 'bg-white/20 text-white'}`}>
              {r >= 1000 ? `${r / 1000} km` : `${r} m`}
            </button>
          ))}
        </div>
      </div>

      {/* Filter chips */}
      {status === 'done' && locations.length > 0 && (
        <div className="flex gap-2 px-4 mt-3 overflow-x-auto scrollbar-hide pb-1 flex-shrink-0">
          <button onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all pressable
              ${filterType === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200'}`}>
            Semua ({locations.length})
          </button>
          {Object.entries(TYPE_INFO).filter(([k]) => k !== 'default').map(([k, v]) => {
            const count = locations.filter(l => l.type === k).length
            if (!count) return null
            return (
              <button key={k} onClick={() => setFilterType(k)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all pressable
                  ${filterType === k ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'}`}
                style={filterType === k ? { background: v.color } : {}}>
                {v.icon} {v.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Tabs */}
      <div className="flex mx-4 mt-3 bg-gray-200 rounded-xl p-1 gap-1 flex-shrink-0">
        {(['map', 'list'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
              ${activeTab === t ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'}`}>
            {t === 'map' ? '🗺️ Peta' : `📋 Daftar${status === 'done' ? ` (${filtered.length})` : ''}`}
          </button>
        ))}
      </div>

      {/* MAP */}
      {activeTab === 'map' && (
        <div className="relative mx-4 mt-3 mb-4 rounded-2xl overflow-hidden shadow-lg flex-1" style={{ minHeight: 430 }}>
          <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: 430 }} />

          {['loading', 'locating'].includes(status) && (
            <div className="absolute inset-0 bg-white/85 flex flex-col items-center justify-center gap-3 z-[1000]">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-600 font-medium">
                {status === 'loading' ? 'Memuat peta...' : 'Mendeteksi lokasi GPS...'}
              </p>
            </div>
          )}

          {status === 'done' && (
            <div className="absolute top-3 left-3 bg-white/95 rounded-xl p-2.5 shadow z-[999] flex flex-col gap-1.5">
              {Object.entries(TYPE_INFO).filter(([k]) => k !== 'default').map(([k, v]) => (
                <div key={k} className="flex items-center gap-2">
                  <span className="text-sm leading-none">{v.icon}</span>
                  <span className="text-xs text-gray-600">{v.label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-1.5 border-t border-gray-100">
                <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow flex-shrink-0" />
                <span className="text-xs text-gray-600">Lokasi Anda</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIST */}
      {activeTab === 'list' && (
        <div className="px-4 mt-2 pb-6 flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">🔍</p>
              <p className="text-gray-700 font-semibold">Tidak ada lokasi ditemukan</p>
              <button onClick={() => changeRadius(5000)}
                className="mt-4 bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm pressable">
                Perluas ke 5 km
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filtered.map(loc => {
                const info = getTypeInfo(loc.type)
                return (
                  <div key={loc.id} onClick={() => flyTo(loc)}
                    className={`bg-white rounded-2xl p-4 border-2 transition-all pressable cursor-pointer
                      ${selected?.id === loc.id ? 'border-blue-400 shadow-md' : 'border-gray-100'}`}>
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: info.bg }}>{info.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm leading-tight">{loc.name}</p>
                        <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1"
                          style={{ background: info.bg, color: info.color }}>{info.label}</span>
                        <p className="text-xs text-gray-400 mt-1 truncate">📍 {loc.address}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-blue-600">{formatDistance(loc.distance)}</p>
                        <p className="text-xs text-gray-400">dari sini</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={e => { e.stopPropagation(); flyTo(loc) }}
                        className="flex-1 bg-blue-50 text-blue-700 py-2.5 rounded-xl text-xs font-semibold pressable">
                        🗺️ Lihat di Peta
                      </button>
                      <a href={`https://www.google.com/maps/dir/?api=1&destination=${loc.lat},${loc.lon}&travelmode=driving`}
                        target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="flex-1 bg-green-600 text-white py-2.5 rounded-xl text-xs font-semibold text-center pressable">
                        🧭 Navigasi
                      </a>
                    </div>
                  </div>
                )
              })}
              <p className="text-center text-xs text-gray-400 py-2">
                🗺️ Data terintegrasi dengan database TPS
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}