import { NextResponse } from 'next/server'

// Mock data
const products = [
  { id: 1, name: 'Tas Daur Ulang', price: 50000, description: 'Tas dari bahan daur ulang' },
  { id: 2, name: 'Botol Ramah Lingkungan', price: 20000, description: 'Botol dari plastik daur ulang' },
]

export async function GET() {
  return NextResponse.json(products)
}