import { NextResponse } from 'next/server'
import { supabase } from '@/app/supabaseClient'

// Points per action
const POINTS = {
  subscription: 20,   // langganan jemput sampah
  pickup_done: 10,    // per penjemputan selesai
  marketplace_sell: 5, // jual sampah di marketplace
  marketplace_buy: 5,  // beli sampah di marketplace
  rating: 2,           // beri rating driver
}

export async function POST(request: Request) {
  try {
    const { user_id, action } = await request.json()

    if (!user_id || !action) {
      return NextResponse.json({ error: 'user_id dan action diperlukan' }, { status: 400 })
    }

    const points = POINTS[action as keyof typeof POINTS]
    if (!points) {
      return NextResponse.json({ error: 'action tidak valid' }, { status: 400 })
    }

    // Call Supabase function to add points and update ranking
    const { error } = await supabase.rpc('add_points_and_update_ranking', {
      p_user_id: user_id,
      p_points: points,
    })

    if (error){
      console.error("DEBUG RPC ERROR:", error); // Lihat ini di terminal VS Code!
      return NextResponse.json({ error: error.message }, { status: 500 });
    } 

    // Get updated user points
    const { data: userData } = await supabase
      .from('users')
      .select('user_point')
      .eq('user_id', user_id)
      .single()

    // Get updated ranking
    const { data: rankData } = await supabase
      .from('leaderboards')
      .select('leaderboard_ranking')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      success: true,
      points_added: points,
      total_points: userData?.user_point || 0,
      ranking: rankData?.leaderboard_ranking || null,
    })

  } catch (err) {
    console.error('Add points error:', err)
    return NextResponse.json({ error: 'Gagal menambah poin' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const user_id = searchParams.get('user_id')

  if (!user_id) {
    return NextResponse.json({ error: 'user_id diperlukan' }, { status: 400 })
  }

  try {
    const { data: userData } = await supabase
      .from('users')
      .select('user_id, user_name, fullname, user_point')
      .eq('user_id', user_id)
      .single()

    const { data: rankData } = await supabase
      .from('leaderboards')
      .select('leaderboard_ranking, leaderboard_period')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      user: userData,
      ranking: rankData?.leaderboard_ranking || null,
      period: rankData?.leaderboard_period || null,
    })
  } catch {
    return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 })
  }
}