import { NextResponse } from 'next/server'
import { supabase } from '@/app/supabaseClient'

const awardReviewPoints = async (user_id: string) => {
  const points = 2

  const rpcResponse = await supabase.rpc('add_points_and_update_ranking', {
    p_user_id: user_id,
    p_points: points,
  })

  if (!rpcResponse.error) return { success: true, points_added: points }

  const { data: currentUser, error: currentErr } = await supabase
    .from('users')
    .select('user_point')
    .eq('user_id', user_id)
    .maybeSingle()

  if (currentErr || !currentUser) {
    return { success: false, points_added: 0, error: rpcResponse.error?.message || currentErr?.message }
  }

  await supabase
    .from('users')
    .update({ user_point: (currentUser.user_point || 0) + points })
    .eq('user_id', user_id)

  return { success: true, points_added: points }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      user_id,
      driver_name,
      rating,
      comment = '',
      transaction_type = 'pickup',
      weight_kg = 1,
    } = body

    if (!user_id || !driver_name) {
      return NextResponse.json({ error: 'user_id dan driver_name diperlukan' }, { status: 400 })
    }

    const score = Number(rating)
    if (!Number.isFinite(score) || score < 1 || score > 5) {
      return NextResponse.json({ error: 'rating harus berada di rentang 1 sampai 5' }, { status: 400 })
    }

    const baseReview = {
      user_id,
      driver_name,
      rating: score,
      comment: comment || `Rating ${score} bintang untuk ${driver_name}`,
      transaction_type,
      weight_kg: Number(weight_kg || 1),
      created_at: new Date().toISOString(),
    }

    const candidates = [
      baseReview,
      { ...baseReview, review_text: baseReview.comment, stars: score, driver_id: driver_name },
      { ...baseReview, review: baseReview.comment, score, driver: driver_name },
    ]

    let inserted = false
    let insertError = null

    for (const candidate of candidates) {
      const response = await supabase.from('reviews').insert([candidate])
      if (!response.error) {
        inserted = true
        insertError = null
        break
      }

      insertError = response.error
    }

    if (!inserted) {
      throw insertError || new Error('Gagal menyimpan review ke tabel reviews')
    }

    const pointResult = await awardReviewPoints(user_id)

    return NextResponse.json({
      success: true,
      message: 'Review berhasil disimpan',
      points_added: pointResult.points_added || 0,
      points_status: pointResult.success ? 'ok' : 'warning',
    })
  } catch (error: any) {
    console.error('Review save error:', error)
    return NextResponse.json({ error: error?.message || 'Gagal menyimpan review' }, { status: 500 })
  }
}
