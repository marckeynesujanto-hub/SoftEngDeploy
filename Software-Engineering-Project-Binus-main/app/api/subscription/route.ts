import { NextRequest, NextResponse } from 'next/server'

// Mock data
let subscriptions = [
  { id: 1, paket: 'mingguan', jadwal: ['Senin', 'Kamis'], isPaused: false, riwayat: [{ tanggal: '2023-10-01', status: 'Selesai' }] }
]

export async function GET() {
  return NextResponse.json(subscriptions)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const newSub = { id: subscriptions.length + 1, ...body, riwayat: [] }
  subscriptions.push(newSub)
  return NextResponse.json(newSub, { status: 201 })
}