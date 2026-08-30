import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IMG } from '../lib/images.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../contexts/AuthContext.jsx'

const DEFAULT_AVATAR = IMG('6ff2f211-4470-4cea-be7a-27dd9e2c267d')
const PODIUM_ACCENTS = ['#9A5C14', '#B87935', '#C18B57']

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export default function LiderlikTablosu() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, points')
      .order('points', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (!cancelled) {
          setRankings(data || [])
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background font-body text-foreground">
        <p className="text-xs text-muted-foreground">Yükleniyor…</p>
      </div>
    )
  }

  const podium = rankings.slice(0, 3)
  const rest = rankings.slice(3)
  const myIndex = rankings.findIndex((r) => r.id === user?.id)
  const me = myIndex >= 0 ? rankings[myIndex] : null

  // Reorder podium visually as [2nd, 1st, 3rd] to match the classic podium layout.
  const podiumOrdered = [podium[1], podium[0], podium[2]].filter(Boolean)

  return (
    <div className="min-h-screen w-full bg-background pb-28 text-foreground font-body">
      <header className="border-b border-border bg-background px-5 pb-4 pt-12">
        <div className="flex items-center gap-3">
          <button
            aria-label="Geri dön"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
          >
            <iconify-icon icon="lucide:arrow-left" class="text-lg"></iconify-icon>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-xl font-extrabold tracking-tight">Liderlik Tablosu</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Puana göre genel sıralama</p>
          </div>
        </div>
      </header>

      <main>
        <section className="px-5 pb-5 pt-5">
          {podiumOrdered.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground">Henüz sıralanacak kullanıcı yok.</p>
          ) : (
            <div className="grid grid-cols-3 items-end gap-2">
              {podiumOrdered.map((p) => {
                const rank = rankings.indexOf(p) + 1
                const isFirst = rank === 1
                const accent = PODIUM_ACCENTS[rank - 1]
                return (
                  <article key={p.id} className={`relative text-center ${isFirst ? '' : 'pt-7'}`}>
                    <div
                      className={`absolute left-1/2 top-0 z-10 flex -translate-x-1/2 items-center justify-center rounded-full text-xs font-extrabold text-white shadow-sm ${
                        isFirst ? 'h-8 w-8' : 'h-7 w-7'
                      }`}
                      style={{ backgroundColor: accent }}
                    >
                      {rank}
                    </div>
                    <button
                      onClick={() => navigate(`/kullanici/${p.id}`)}
                      className={`flex w-full flex-col items-center rounded-theme bg-card px-2 pb-3 shadow-sm ${
                        isFirst ? 'border-2 pb-4 pt-10' : 'border border-border pt-9'
                      }`}
                      style={isFirst ? { borderColor: accent } : undefined}
                    >
                      <div
                        className={`overflow-hidden rounded-full border-2 bg-muted ${isFirst ? 'h-[68px] w-[68px]' : 'h-14 w-14'}`}
                        style={{ borderColor: accent }}
                      >
                        <img src={p.avatar_url || DEFAULT_AVATAR} alt={p.display_name} className="h-full w-full object-cover" />
                      </div>
                      <p className={`mt-2 w-full truncate font-bold ${isFirst ? 'text-sm' : 'text-xs'}`}>{p.display_name}</p>
                      <p className={`mt-1 font-heading font-extrabold text-primary ${isFirst ? 'text-lg' : 'text-base'}`}>
                        {p.points}
                      </p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">puan</p>
                    </button>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {rest.length > 0 && (
          <section className="border-t border-border px-5 pb-8 pt-5">
            <h2 className="font-heading text-base font-bold tracking-tight">Sıralama</h2>

            <div className="mt-4 overflow-hidden rounded-theme border border-border bg-card shadow-sm">
              {rest.map((r, i) => {
                const rank = i + 4
                return (
                  <button
                    key={r.id}
                    onClick={() => navigate(`/kullanici/${r.id}`)}
                    className={`flex w-full items-center gap-3 px-3 py-3.5 text-left ${
                      i < rest.length - 1 ? 'border-b border-border' : ''
                    } ${r.id === user?.id ? 'bg-secondary/40' : ''}`}
                  >
                    <span className="w-6 text-center font-heading text-sm font-extrabold text-muted-foreground">
                      {rank}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-bold text-secondary-foreground">
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt={r.display_name} className="h-full w-full object-cover" />
                      ) : (
                        initials(r.display_name)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{r.display_name}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">@{r.username}</p>
                    </div>
                    <p className="font-heading text-sm font-extrabold text-primary">{r.points}</p>
                  </button>
                )
              })}
            </div>
          </section>
        )}
      </main>

      {me && myIndex >= 3 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 px-5 pb-5 pt-3 backdrop-blur-md">
          <button
            onClick={() => navigate('/profil')}
            className="mx-auto flex w-full max-w-[393px] items-center gap-3 rounded-theme border border-primary bg-card px-3 py-3 text-left"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">
              {myIndex + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Senin sıran</p>
              <p className="mt-0.5 text-sm font-bold">{me.display_name}</p>
            </div>
            <p className="font-heading text-base font-extrabold text-primary">{me.points}</p>
          </button>
        </div>
      )}
    </div>
  )
}
