import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// TOTP enroll/challenge/verify dizisi — 2026-09-14 kullanıcı isteği
// ("kayıt olurken... 2 adımlı doğrulama falan da yaptıralım isteğe
// bağlı olarak") öncesinde bu mantık tamamen IkiAsamaliDogrulama.jsx'in
// (Ayarlar > İki Aşamalı Doğrulama) içindeydi. Artık İlkKullanimRehberi.jsx
// da (kayıt sonrası isteğe bağlı kurulum adımı) aynı akışı kullanıyor —
// Supabase'in mfa.* çağrıları iki yerde ayrı ayrı yazılıp zamanla
// birbirinden sapmasın diye tek bir hook'a taşındı. Mesaj/toast seçimi
// bilerek burada değil — her ekran kendi t() metinleriyle, dönen `error`
// nesnesine göre kendi gösterimini yapıyor (biri toast, biri satır içi).
export function useTotpEnrollment() {
  const [factor, setFactor] = useState(null) // doğrulanmış TOTP faktörü, yoksa null
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollData, setEnrollData] = useState(null) // { id, qrCode, secret }
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadFactors() {
    const { data, error } = await supabase.auth.mfa.listFactors()
    if (!error) {
      setFactor((data?.totp || []).find((f) => f.status === 'verified') || null)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadFactors()
  }, [])

  async function startEnroll() {
    setBusy(true)
    // friendlyName olmadan Supabase varsayılan olarak boş bir string
    // kullanıyor — bir kullanıcı kaydolur/iptal eder/tekrar dener (tam da
    // bu ekranın hem Rehber'de hem Ayarlar'da izin verdiği akış) döngüsünü
    // birkaç kez yaparsa "A factor with the friendly name "" for this user
    // already exists" (mfa_factor_name_conflict) hatasına çarpıyor —
    // gerçek bir kayıt sırasında bulundu (yeni hesapla uçtan uca test
    // edilirken), tahmin edilmedi. Her denemeye benzersiz bir isim vererek
    // çakışma tamamen ortadan kalkıyor.
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: `totp-${Date.now()}`,
    })
    setBusy(false)
    if (error) return { error }
    setEnrollData({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret })
    setEnrolling(true)
    return { error: null }
  }

  async function verifyEnroll() {
    if (code.trim().length !== 6 || busy) return { error: null }
    setBusy(true)
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enrollData.id,
    })
    if (challengeError) {
      setBusy(false)
      return { error: challengeError }
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: enrollData.id,
      challengeId: challenge.id,
      code: code.trim(),
    })
    setBusy(false)
    if (verifyError) return { error: verifyError }
    setEnrolling(false)
    setEnrollData(null)
    setCode('')
    await loadFactors()
    return { error: null }
  }

  async function cancelEnroll() {
    if (enrollData) await supabase.auth.mfa.unenroll({ factorId: enrollData.id }).catch(() => {})
    setEnrolling(false)
    setEnrollData(null)
    setCode('')
  }

  async function disable() {
    if (!factor || busy) return { error: null }
    setBusy(true)
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id })
    setBusy(false)
    if (error) return { error }
    await loadFactors()
    return { error: null }
  }

  return {
    factor,
    loading,
    enrolling,
    enrollData,
    code,
    setCode,
    busy,
    startEnroll,
    verifyEnroll,
    cancelEnroll,
    disable,
  }
}
