import { NextResponse } from 'next/server'
 
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = parseFloat(searchParams.get('lat') || '-6.2088')
  const lon = parseFloat(searchParams.get('lon') || '106.8456')
  const radius = parseInt(searchParams.get('radius') || '2000')
 
  try {
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="waste_basket"](around:${radius},${lat},${lon});
        node["amenity"="recycling"](around:${radius},${lat},${lon});
        node["amenity"="waste_disposal"](around:${radius},${lat},${lon});
      );
      out body;
    `
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    const data = await res.json()
    return NextResponse.json(data.elements || [])
  } catch {
    return NextResponse.json([])
  }
}
 
