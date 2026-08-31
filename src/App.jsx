import { Suspense, lazy } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { PresenceProvider } from './contexts/PresenceContext.jsx'
import { UserSettingsProvider } from './contexts/UserSettingsContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AccentColor from './components/AccentColor.jsx'
import AndroidBackButton from './components/AndroidBackButton.jsx'
import TabLayout from './layouts/TabLayout.jsx'
import Giris from './screens/Giris.jsx'
import Anasayfa from './screens/Anasayfa.jsx'

// Everything reached by navigating further in is loaded on demand, so the
// initial bundle only has to parse the login screen + home feed up front.
const Gruplar = lazy(() => import('./screens/Gruplar.jsx'))
const Mesajlar = lazy(() => import('./screens/Mesajlar.jsx'))
const Kesfet = lazy(() => import('./screens/Kesfet.jsx'))
const Profil = lazy(() => import('./screens/Profil.jsx'))
const TahminOlustur = lazy(() => import('./screens/TahminOlustur.jsx'))
const TahminKaydi = lazy(() => import('./screens/TahminKaydi.jsx'))
const Sohbet = lazy(() => import('./screens/Sohbet.jsx'))
const LiderlikTablosu = lazy(() => import('./screens/LiderlikTablosu.jsx'))
const Rozetler = lazy(() => import('./screens/Rozetler.jsx'))
const ProfilAyarlari = lazy(() => import('./screens/ProfilAyarlari.jsx'))
const UygulamaAyarlari = lazy(() => import('./screens/UygulamaAyarlari.jsx'))
const Hareketler = lazy(() => import('./screens/Hareketler.jsx'))
const KullaniciProfili = lazy(() => import('./screens/KullaniciProfili.jsx'))
const GrupDetayi = lazy(() => import('./screens/GrupDetayi.jsx'))
const EngellenenHesaplar = lazy(() => import('./screens/EngellenenHesaplar.jsx'))
const TakipIstekleri = lazy(() => import('./screens/TakipIstekleri.jsx'))
const EpostaVeTelefon = lazy(() => import('./screens/EpostaVeTelefon.jsx'))
const SifreDegistir = lazy(() => import('./screens/SifreDegistir.jsx'))
const IkiAsamaliDogrulama = lazy(() => import('./screens/IkiAsamaliDogrulama.jsx'))
const HesabiDondur = lazy(() => import('./screens/HesabiDondur.jsx'))
const TahminGorunurlugu = lazy(() => import('./screens/TahminGorunurlugu.jsx'))
const MesajIstekleri = lazy(() => import('./screens/MesajIstekleri.jsx'))
const AktifOturumlar = lazy(() => import('./screens/AktifOturumlar.jsx'))
const EtiketlemeVeBahsetmeler = lazy(() => import('./screens/EtiketlemeVeBahsetmeler.jsx'))

function ScreenFallback() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background font-body">
      <div className="flex h-10 w-10 items-center justify-center rounded-theme bg-primary font-heading text-xs font-extrabold text-primary-foreground">
        GTF
      </div>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <UserSettingsProvider>
            <PresenceProvider>
              <AccentColor />
              <AndroidBackButton />
              <HashRouter>
                <Suspense fallback={<ScreenFallback />}>
                  <Routes>
                    <Route path="/giris" element={<Giris />} />

                    <Route element={<ProtectedRoute />}>
                      <Route element={<TabLayout />}>
                        <Route path="/" element={<Anasayfa />} />
                        <Route path="/gruplar" element={<Gruplar />} />
                        <Route path="/mesajlar" element={<Mesajlar />} />
                        <Route path="/kesfet" element={<Kesfet />} />
                        <Route path="/profil" element={<Profil />} />
                      </Route>

                      <Route path="/tahmin-olustur" element={<TahminOlustur />} />
                      <Route path="/tahmin-kaydi" element={<TahminKaydi />} />
                      <Route path="/sohbet" element={<Sohbet />} />
                      <Route path="/liderlik-tablosu" element={<LiderlikTablosu />} />
                      <Route path="/rozetler" element={<Rozetler />} />
                      <Route path="/profil-ayarlari" element={<ProfilAyarlari />} />
                      <Route path="/uygulama-ayarlari" element={<UygulamaAyarlari />} />
                      <Route path="/hareketler" element={<Hareketler />} />
                      <Route path="/kullanici/:userId" element={<KullaniciProfili />} />
                      <Route path="/grup/:groupId" element={<GrupDetayi />} />
                      <Route path="/ayarlar/engellenenler" element={<EngellenenHesaplar />} />
                      <Route path="/ayarlar/takip-istekleri" element={<TakipIstekleri />} />
                      <Route path="/ayarlar/eposta-telefon" element={<EpostaVeTelefon />} />
                      <Route path="/ayarlar/sifre-degistir" element={<SifreDegistir />} />
                      <Route path="/ayarlar/iki-asamali-dogrulama" element={<IkiAsamaliDogrulama />} />
                      <Route path="/ayarlar/hesabi-dondur" element={<HesabiDondur />} />
                      <Route path="/ayarlar/tahmin-gorunurlugu" element={<TahminGorunurlugu />} />
                      <Route path="/ayarlar/mesaj-istekleri" element={<MesajIstekleri />} />
                      <Route path="/ayarlar/aktif-oturumlar" element={<AktifOturumlar />} />
                      <Route path="/ayarlar/etiketleme-bahsetmeler" element={<EtiketlemeVeBahsetmeler />} />
                    </Route>
                  </Routes>
                </Suspense>
              </HashRouter>
            </PresenceProvider>
          </UserSettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
