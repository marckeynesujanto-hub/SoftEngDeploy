import { NextResponse } from 'next/server'

// Mock data
const leaderboard = [
  { name: 'User1', points: 150, badge: 'Eco Warrior' },
  { name: 'User2', points: 120, badge: 'Green Saver' },
  { name: 'User3', points: 100, badge: 'Recycle Hero' },
]

export async function GET() {
  return NextResponse.json(leaderboard)
}