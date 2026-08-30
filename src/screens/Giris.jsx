import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Giris() {
  const navigate = useNavigate()
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [signupDone, setSignupDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn({ email, password })
        navigate('/', { replace: true })
      } else {
        const result = await signUp({ email, password, username, displayName })
        if (result.session) {
          // Email confirmation is disabled on the backend — we're already logged in.
          navigate('/', { replace: true })
        } else {
          setSignupDone(true)
        }
      }
    } catch (err) {
      setError(err.message || 'Bir şeyler ters gitti, tekrar deneyin.')
    } finally {
      setBusy(false)
    }
  }

  if (signupDone) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background px-8 text-center font-body text-foreground">
        <div className="flex h-14 w-14 items-center justify-center rounded-theme bg-success text-success-foreground">
          <iconify-icon icon="lucide:mail-check" class="text-2xl"></iconify-icon>
        </div>
        <h1 className="mt-5 font-heading text-xl font-extrabold tracking-tight">E-postanı doğrula</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          <span className="font-semibold text-foreground">{email}</span> adresine bir doğrulama bağlantısı
          gönderdik. Onayladıktan sonra giriş yapabilirsin.
        </p>
        <button
          onClick={() => {
            setSignupDone(false)
            setMode('signin')
          }}
          className="mt-6 rounded-theme bg-primary px-5 py-3 text-sm font-bold text-primary-foreground"
        >
          Girişe dön
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col justify-center bg-background px-6 font-body text-foreground">
      <div className="mx-auto w-full max-w-[360px]">
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-theme bg-primary font-heading text-lg font-extrabold tracking-[-0.08em] text-primary-foreground">
            GTF
          </div>
          <h1 className="mt-4 font-heading text-2xl font-extrabold tracking-[-0.05em] text-primary">
            Gelecek Tahmin Fonu
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === 'signin' ? 'Hesabına giriş yap' : 'Yeni bir hesap oluştur'}
          </p>
        </div>

        <div className="mt-7 flex rounded-theme bg-secondary p-1">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 rounded-[10px] py-2.5 text-sm font-bold ${
              mode === 'signin' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-secondary-foreground'
            }`}
          >
            Giriş yap
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-[10px] py-2.5 text-sm font-bold ${
              mode === 'signup' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-secondary-foreground'
            }`}
          >
            Kayıt ol
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="mb-2 block text-sm font-bold text-foreground">Görünen ad</label>
                <input
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Elif Demir"
                  className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground shadow-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-foreground">Kullanıcı adı</label>
                <input
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                  placeholder="elifdemir"
                  className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground shadow-sm outline-none"
                />
              </div>
            </>
          )}
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">E-posta</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ornek@eposta.com"
              className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground shadow-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-foreground">Parola</label>
            <input
              required
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="En az 6 karakter"
              className="w-full rounded-theme border border-border bg-input px-4 py-3 text-sm text-foreground shadow-sm outline-none"
            />
          </div>

          {error && (
            <p className="rounded-theme bg-destructive/10 px-3 py-2.5 text-xs font-semibold text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-theme bg-primary px-4 py-3.5 text-sm font-extrabold text-primary-foreground shadow-sm disabled:opacity-60"
          >
            {busy ? 'Lütfen bekleyin…' : mode === 'signin' ? 'Giriş yap' : 'Hesap oluştur'}
          </button>
        </form>
      </div>
    </div>
  )
}
