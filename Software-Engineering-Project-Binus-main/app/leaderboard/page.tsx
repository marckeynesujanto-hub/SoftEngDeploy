'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/supabaseClient'

interface LeaderboardUser {
  user_id: string
  user_name: string
  fullname: string
  user_point: number
  ranking?: number
}

const BADGE_LEVELS = [
  { min: 0,   label: 'Recycle Starter', icon: '🌱', color: '#16a34a', next: 50   },
  { min: 50,  label: 'Green Saver',     icon: '🌿', color: '#0891b2', next: 100  },
  { min: 100, label: 'Recycle Hero',    icon: '♻️', color: '#7c3aed', next: 200  },
  { min: 200, label: 'Eco Warrior',     icon: '🌍', color: '#dc2626', next: 500  },
  { min: 500, label: 'Earth Champion',  icon: '🏆', color: '#d97706', next: null },
]

function getBadge(points: number) {
  return [...BADGE_LEVELS].reverse().find(b => points >= b.min) || BADGE_LEVELS[0]
}

const MEDAL = ['🥇', '🥈', '🥉']

// Current user — ganti dengan user_id dari auth kalian nanti
const CURRENT_USER_ID = '32d67f98-4d25-4871-b2ce-19f1c11ba013'

export default function LeaderboardPage() {
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [currentUser, setCurrentUser] = useState<LeaderboardUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'board' | 'badges'>('board')

  useEffect(() => { fetchLeaderboard() }, [])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('user_id, user_name, fullname, user_point')
        .order('user_point', { ascending: false })

      if (!error && data && data.length > 0) {
        const ranked = data.map((u, i) => ({ ...u, ranking: i + 1 }))
        setUsers(ranked)
        setCurrentUser(ranked.find(u => u.user_id === CURRENT_USER_ID) || null)
      }
    } catch { }
    setLoading(false)
  }

  const myPoints = currentUser?.user_point || 0
  const myBadge = getBadge(myPoints)
  const myRank = currentUser?.ranking || '-'
  const progressToNext = myBadge.next
    ? Math.round((myPoints - myBadge.min) / (myBadge.next - myBadge.min) * 100)
    : 100

  const displayName = (u: LeaderboardUser) => u.fullname || u.user_name || 'User'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-500 to-green-500 px-5 pt-14 pb-6 rounded-b-3xl">
        <h1 className="text-white text-xl font-bold">Leaderboard</h1>
        <p className="text-yellow-100 text-xs mt-0.5">Reset setiap tanggal 1 tiap bulan 🏆</p>
        <div className="mt-4 bg-white/20 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 bg-white/30 rounded-full flex items-center justify-center text-2xl">
              {myBadge.icon}
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold">{currentUser ? displayName(currentUser) : 'Anda'}</p>
              <p className="text-yellow-100 text-xs">{myBadge.label} · Peringkat #{myRank}</p>
            </div>
            <div className="text-right">
              <p className="text-white text-2xl font-bold">{myPoints}</p>
              <p className="text-yellow-100 text-xs">poin</p>
            </div>
          </div>
          {myBadge.next && (
            <div>
              <div className="flex justify-between text-xs text-yellow-100 mb-1">
                <span>Menuju {getBadge(myBadge.next).label} {getBadge(myBadge.next).icon}</span>
                <span>{myPoints}/{myBadge.next} poin</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-1000"
                  style={{ width: `${progressToNext}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mx-4 mt-4 bg-gray-200 rounded-xl p-1 gap-1">
        {([['board', '🏆 Peringkat'], ['badges', '🎖️ Badge']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all
              ${activeTab === key ? 'bg-white text-yellow-700 shadow-sm' : 'text-gray-500'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* LEADERBOARD TAB */}
      {activeTab === 'board' && (
        <div className="px-4 mt-4 pb-6">
          {!loading && users.length >= 3 && (
            <div className="mb-5">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Top 3 Bulan Ini</p>
              <div className="flex items-end justify-center gap-2">
                {[1, 0, 2].map((pos, i) => {
                  const user = users[pos]
                  const heights = [70, 90, 55]
                  const bgColors = ['bg-gray-200', 'bg-yellow-200', 'bg-green-100']
                  return (
                    <div key={pos} className="flex-1 flex flex-col items-center">
                      <p className="text-2xl mb-1">{MEDAL[pos]}</p>
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-1
                        ${pos === 0 ? 'ring-2 ring-yellow-400 bg-yellow-50' : 'bg-gray-100'}`}>
                        {getBadge(user?.user_point || 0).icon}
                      </div>
                      <p className="text-xs font-semibold text-gray-700 text-center truncate w-full px-1">
                        {user ? displayName(user) : '-'}
                      </p>
                      <p className="text-xs text-gray-500">{user?.user_point || 0} poin</p>
                      <div className={`w-full ${bgColors[i]} rounded-t-xl mt-2`} style={{ height: heights[i] }} />
                    </div>
                  )
                })}
              </div>
              <div className="bg-yellow-50 rounded-xl p-3 text-center border border-yellow-200 mt-1">
                <p className="text-xs text-yellow-700">🎁 Top 3 mendapat hadiah voucher di akhir bulan!</p>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Semua Peringkat</p>
          {loading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse h-16 border border-gray-100" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {users.map((user, index) => {
                const badge = getBadge(user.user_point)
                const isMe = user.user_id === CURRENT_USER_ID
                return (
                  <div key={user.user_id}
                    className={`rounded-2xl p-4 flex items-center gap-3 border
                      ${isMe ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
                    <span className="text-lg w-8 text-center font-bold text-gray-500">
                      {index < 3 ? MEDAL[index] : `${index + 1}`}
                    </span>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xl"
                      style={{ background: badge.color + '20' }}>
                      {badge.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {displayName(user)}
                        {isMe && <span className="text-yellow-600 text-xs ml-1">(Anda)</span>}
                      </p>
                      <p className="text-xs text-gray-400">{badge.label}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-800">{user.user_point}</p>
                      <p className="text-xs text-gray-400">poin</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* BADGES TAB */}
      {activeTab === 'badges' && (
        <div className="px-4 mt-4 pb-6">
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide mb-3">Semua Level Badge</p>
          <div className="flex flex-col gap-3">
            {BADGE_LEVELS.map((b, i) => {
              const achieved = myPoints >= b.min
              const isCurrent = getBadge(myPoints).min === b.min
              return (
                <div key={i} className={`rounded-2xl p-4 border-2 transition-all
                  ${isCurrent ? 'border-green-400 bg-yellow-50'
                    : achieved ? 'border-green-200 bg-green-50'
                    : 'border-gray-100 bg-white'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl
                      ${achieved ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                      {b.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-bold text-sm ${achieved ? 'text-gray-800' : 'text-gray-400'}`}>
                          {b.label}
                        </p>
                        {isCurrent && (
                          <span className="text-xs bg-yellow-400 text-white px-2 py-0.5 rounded-full font-semibold">
                            Level Anda
                          </span>
                        )}
                        {achieved && !isCurrent && (
                          <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-semibold">
                            ✓ Tercapai
                          </span>
                        )}
                      </div>
                      <p className={`text-xs ${achieved ? 'text-gray-500' : 'text-gray-300'}`}>
                        {b.min}+ poin diperlukan
                      </p>
                      {isCurrent && b.next && (
                        <div className="mt-2">
                          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full"
                              style={{ width: `${progressToNext}%` }} />
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {myPoints}/{b.next} poin menuju level berikutnya
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 bg-green-50 rounded-2xl p-4 border border-green-100">
            <p className="text-sm font-semibold text-green-800 mb-2">💡 Cara dapat poin</p>
            <div className="flex flex-col gap-1.5">
              {[
                { action: 'Langganan jemput sampah', points: '+20 poin' },
                { action: 'Per penjemputan selesai', points: '+10 poin' },
                { action: 'Jual sampah di marketplace', points: '+5 poin' },
                { action: 'Beli sampah di marketplace', points: '+5 poin' },
                { action: 'Beri rating driver', points: '+2 poin' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center">
                  <p className="text-xs text-green-600">✓ {item.action}</p>
                  <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                    {item.points}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}