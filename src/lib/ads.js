import { Capacitor } from '@capacitor/core'
import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob'
import { supabase } from './supabase.js'

// docs/designs/ad-monetization-strategy.md, Approach A — tek ağ (AdMob), v1
// tek ad unit (mühür ekranında banner). Native-only (web/masaüstü tarayıcıda
// bu plugin hiçbir şey render etmiyor — Capacitor'ın kendi web şimi de yok,
// bu yüzden her fonksiyon platform kontrolüyle başlıyor).
//
// Google'ın herkese açık, resmi TEST kimlikleri — gerçek bir AdMob hesabı
// onaylanana kadar (bkz. tasarım dokümanının "Gating" bağımlılığı) SADECE
// bunlar kullanılmalı. Gerçek reklam ID'leriyle test etmek "geçersiz trafik"
// sayılıp hesabı askıya aldırabilir.
// https://developers.google.com/admob/android/test-ads
// https://developers.google.com/admob/ios/test-ads
const TEST_BANNER_AD_UNIT_ID = {
  android: 'ca-app-pub-3940256099942544/6300978111',
  ios: 'ca-app-pub-3940256099942544/2934735716',
}

// Rıza/ATT akışı henüz tasarlanmadı (bkz. tasarım dokümanının Open
// Questions'ı) — bu yüzden npa (non-personalized ads) burada BİLİNÇLİ olarak
// hep true. Gerçek bir rıza ekranı kurulup kullanıcı kişiselleştirilmiş
// reklamı açıkça kabul etmedikçe bu false'a çevrilmemeli.
const NPA_UNTIL_CONSENT_FLOW_EXISTS = true

export function isAdsPlatformSupported() {
  const platform = Capacitor.getPlatform()
  return platform === 'android' || platform === 'ios'
}

let initPromise = null

function initAds() {
  if (!initPromise) {
    initPromise = AdMob.initialize({ initializeForTesting: true }).catch((err) => {
      initPromise = null
      throw err
    })
  }
  return initPromise
}

// Kill switch: schema.sql'e eklenen app_config tablosundaki tek bir satır —
// retention düşerse kod deploy'u gerektirmeden anında kapatılabilir (bkz.
// Success Criteria). Tablo/satır henüz yoksa (migrasyon çalıştırılmadıysa)
// ya da okuma herhangi bir nedenle başarısız olursa, reklamlar güvenli
// tarafta kalıp GÖSTERİLMEZ — varsayılan açık değil, kapalı.
export async function areAdsEnabled() {
  const { data, error } = await supabase.from('app_config').select('value').eq('key', 'ads_enabled').maybeSingle()
  if (error || !data) return false
  return data.value === true
}

let bannerActive = false

// TahminKaydi.jsx'in açılmış (isRevealed) haliyle eşleştirilmiş — ekranın
// altına sabit, native bir overlay banner (bu plugin DOM'a değil, native
// katmana çiziyor, bu yüzden React ağacının bir parçası değil, sadece
// göster/gizle çağrıları).
export async function showSealBanner() {
  if (!isAdsPlatformSupported()) return
  if (!(await areAdsEnabled())) return
  const platform = Capacitor.getPlatform()
  const adId = TEST_BANNER_AD_UNIT_ID[platform]
  if (!adId) return
  try {
    await initAds()
    await AdMob.showBanner({
      adId,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      isTesting: true,
      npa: NPA_UNTIL_CONSENT_FLOW_EXISTS,
    })
    bannerActive = true
  } catch {
    // Reklam yüklenemedi (ağ yok, envanter yok, plugin native tarafta henüz
    // kurulmamış, vs.) — kullanıcı akışını hiçbir şekilde kesmemeli, sessizce
    // vazgeç. Ekranda görünmeyen bir banner, GTF'nin asıl işlevini (tahmin
    // görüntüleme) hiçbir şekilde engellemiyor.
  }
}

export async function hideSealBanner() {
  if (!isAdsPlatformSupported() || !bannerActive) return
  bannerActive = false
  try {
    await AdMob.removeBanner()
  } catch {
    // no-op — zaten kapatılmaya çalışılıyor, hata burada önemsiz.
  }
}
