import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useToast } from '../contexts/ToastContext.jsx'

export default function AktifOturumlar() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOutOthers() {
    if (signingOut) return
    setSigningOut(true)
    const { error } = await supabase.auth.signOut({ scope: 'others' })
    setSigningOut(false)
    if (error) {
      showToast(error.message || 'İşlem başarısız oldu, tekrar dene.')
      return
    }
    showToast('Bu cihaz dışındaki tüm oturumlar kapatıldı.', 'success')
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-body pb-28">
      <header className="flex items-center justify-between px-5 pt-12">
        <button
          aria-label="Geri dön"
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-theme border border-border bg-card text-foreground shadow-sm"
        >
          <iconify-icon icon="lucide:arrow-left" class="text-[19px]"></iconify-icon>
        </button>
        <h1 className="font-heading text-[17px] font-extrabold tracking-[-0.035em]">Aktif oturumlar</h1>
        <div className="h-10 w-10" />
      </header>

      <main className="px-5 pt-7">
        <section>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary">Hesap güvenliği</p>
          <h2 className="mt-2 max-w-[335px] font-heading text-[25px] font-extrabold leading-[1.15] tracking-[-0.05em]">
            Giriş yaptığın cihazlar
          </h2>
          <p className="mt-3 max-w-[345px] text-[13px] leading-5 text-muted-foreground">
            Tanımadığın bir cihazdan giriş yapıldığını düşünüyorsan, tüm diğer cihazlardan çıkış yapabilirsin.
          </p>
        </section>

        <section className="mt-7 rounded-theme border border-primary/30 bg-card p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-theme bg-secondary text-primary">
              <iconify-icon icon="lucide:smartphone" class="text-[22px]"></iconify-icon>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-[15px] font-extrabold tracking-[-0.025em]">Bu cihaz</h3>
                <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  Şimdi aktif
                </span>
              </div>
              <p className="mt-1 text-[12px] font-medium text-muted-foreground">Şu an kullandığın oturum</p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-theme border border-border bg-muted/60 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm">
              <iconify-icon icon="lucide:info" class="text-[16px]"></iconify-icon>
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-foreground">Cihaz ve konum listesi henüz yok</h3>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                Şu an her bir cihazı ayrı ayrı görüp tek tek kapatamıyorsun — ama aşağıdaki buton bu cihaz
                dışındaki her oturumu tek seferde kapatır.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-theme border border-border bg-muted p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-primary shadow-sm">
              <iconify-icon icon="lucide:shield-check" class="text-[16px]"></iconify-icon>
            </div>
            <div>
              <h3 className="text-[12px] font-bold text-foreground">Tanımadığın bir giriş mi var?</h3>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                Diğer cihazlardan çıkış yapıp ardından şifreni değiştirmen hesabını güvenceye alır.
              </p>
            </div>
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-background/95 px-5 pb-6 pt-3 backdrop-blur-md">
        <button
          onClick={handleSignOutOthers}
          disabled={signingOut}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-theme bg-primary text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-60"
        >
          <iconify-icon icon="lucide:log-out" class="text-[18px]"></iconify-icon>
          {signingOut ? 'Kapatılıyor…' : 'Diğer tüm cihazlardan çıkış yap'}
        </button>
      </div>
    </div>
  )
}
