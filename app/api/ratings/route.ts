import { NextResponse } from 'next/server'
import { supabase } from '@/app/supabaseClient'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { user_id, rating, comment } = body
    
    console.log('📥 [/api/ratings] Received:', { user_id, rating, comment })

    if (!user_id || !rating) {
      console.error('❌ [/api/ratings] Missing required fields:', { user_id, rating })
      return NextResponse.json(
        { error: 'user_id dan rating diperlukan' },
        { status: 400 }
      )
    }

    if (rating < 1 || rating > 5) {
      console.error('❌ [/api/ratings] Invalid rating:', rating)
      return NextResponse.json(
        { error: 'Rating harus antara 1-5' },
        { status: 400 }
      )
    }

    console.log('💾 [/api/ratings] Inserting rating to reviews table...')
    
    // Insert rating ke tabel reviews
    const { data, error } = await supabase
      .from('reviews')
      .insert([
        {
          user_id,
          review_rating: rating,
          review_comment: comment || null,
        },
      ])
      .select()

    if (error) {
      console.error('❌ [/api/ratings] Database error:', error)
      return NextResponse.json(
        { error: `Database error: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('✅ [/api/ratings] Rating inserted:', data)

    // Call /api/points to add rating points (sama seperti subscription)
    console.log('🔄 [/api/ratings] Adding points via /api/points...')
    try {
      const pointsResponse = await fetch(`${request.url.split('/api')[0]}/api/points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id,
          action: 'rating',
        }),
      })

      const pointsData = await pointsResponse.json()
      console.log('✅ [/api/ratings] Points added:', pointsData)
    } catch (pointsErr) {
      console.warn('⚠️ [/api/ratings] Points API error (but rating saved):', pointsErr)
      // Don't fail - rating is already saved
    }

    return NextResponse.json({
      success: true,
      message: 'Rating berhasil disimpan dan poin ditambahkan',
      data,
    })
  } catch (error) {
    console.error('❌ [/api/ratings] Unexpected error:', error)
    return NextResponse.json(
      { error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
