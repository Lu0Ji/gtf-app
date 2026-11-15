import { Suspense, lazy } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx'
import { ToastProvider } from './contexts/ToastContext.jsx'
import { ThemeProvider } from './contexts/ThemeContext.jsx'
import { PresenceProvider } from './contexts/PresenceContext.jsx'
import { UserSettingsProvider } from './contexts/UserSettingsContext.jsx'
import { UnreadMessagesProvider } from './contexts/UnreadMessagesContext.jsx'
import { UnreadActivityProvider } from './contexts/UnreadActivityContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AccentColor from './components/AccentColor.jsx'
import AndroidBackButton from './components/AndroidBackButton.jsx'
import NativeStatusBar from './components/NativeStatusBar.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import AppShell from './layouts/AppShell.jsx'
import TabLayout from './layouts/TabLayout.jsx'
import Giris from './screens/Giris.jsx'
import Anasayfa from './screens/Anasayfa.jsx'
import NotFound from './screens/NotFound.jsx'

// Everything reached by navigating further in is loaded on demand, so the
// initial bundle only has to parse the login screen + home feed up front.
const Gruplar = lazy(() => import('./screens/Gruplar.jsx'))
const Mesajlar = lazy(() => import('./screens/Mesajlar.jsx'))
const Kesfet = lazy(() => import('./screens/Kesfet.jsx'))
const Profil = lazy(() => import('./screens/Profil.jsx'))
const TahminOlustur = lazy(() => import('./screens/TahminOlustur.jsx'))
const TahminKaydi = lazy(() => import('./screens/TahminKaydi.jsx'))
const Sohbet = lazy(() => import('./screens/Sohbet.jsx'))
const GrupSohbeti = lazy(() => import('./screens/GrupSohbeti.jsx'))
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
const HassasIcerikKontrolu = lazy(() => import('./screens/HassasIcerikKontrolu.jsx'))
const BolgeVeTarihBicimi = lazy(() => import('./screens/BolgeVeTarihBicimi.jsx'))
const AramaGecmisi = lazy(() => import('./screens/AramaGecmisi.jsx'))
const Begeniler = lazy(() => import('./screens/Begeniler.jsx'))
const YardimMerkezi = lazy(() => import('./screens/YardimMerkezi.jsx'))
const TopluluKurallari = lazy(() => import('./screens/TopluluKurallari.jsx'))
const IlkKullanimRehberi = lazy(() => import('./screens/IlkKullanimRehberi.jsx'))
const YeniSifreBelirle = lazy(() => import('./screens/YeniSifreBelirle.jsx'))
const AdminPanel = lazy(() => import('./screens/AdminPanel.jsx'))

function ScreenFallback() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background font-body">
      <div className="flex h-10 w-10 items-center justify-center rounded-theme bg-primary font-heading text-xs font-extrabold text-primary-foreground">
        GTF
      </div>
    </div>
  )
}

// Gates the whole router on passwordRecovery instead of adding a route for
// it — see AuthContext's passwordRecovery comment for why a route can't
// reliably own this: HashRouter's own routing and Supabase's recovery-link
// redirect both want to interpret the URL fragment, and they don't agree.
// A component here, one level below AuthProvider, is what lets this call
// useAuth() at all (App() itself renders AuthProvider, so it can't consume
// the context it's declaring).
function PasswordRecoveryGate({ children }) {
  const { passwordRecovery } = useAuth()
  return passwordRecovery ? <YeniSifreBelirle /> : children
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <UserSettingsProvider>
            <PresenceProvider>
              <UnreadMessagesProvider>
              <UnreadActivityProvider>
                <AccentColor />
                <AndroidBackButton />
                <HashRouter>
                  {/* Inside the router (unlike AndroidBackButton) — it keys
                      off the current route to spot the auth screen. */}
                  <NativeStatusBar />
                  <ErrorBoundary>
                    <Suspense fallback={<ScreenFallback />}>
                      <PasswordRecoveryGate>
                      <Routes>
                        <Route path="/giris" element={<Giris />} />

                        <Route element={<ProtectedRoute />}>
                          {/* Full-bleed, no sidebar — a focused first-run flow,
                              not a screen you navigate away from mid-slide. */}
                          <Route path="/rehber" element={<IlkKullanimRehberi />} />

                          <Route element={<AppShell />}>
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
                            <Route path="/grup-sohbeti" element={<GrupSohbeti />} />
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
                            <Route path="/ayarlar/hassas-icerik" element={<HassasIcerikKontrolu />} />
                            <Route path="/ayarlar/bolge-tarih" element={<BolgeVeTarihBicimi />} />
                            <Route path="/ayarlar/arama-gecmisi" element={<AramaGecmisi />} />
                            <Route path="/begeniler" element={<Begeniler />} />
                            <Route path="/ayarlar/yardim-merkezi" element={<YardimMerkezi />} />
                            <Route path="/ayarlar/topluluk-kurallari" element={<TopluluKurallari />} />
                            <Route path="/admin" element={<AdminPanel />} />
                          </Route>
                        </Route>

                        {/* Catches any hash the routes above didn't match
                            (stale bookmark, mistyped/dead deep link) — a
                            top-level sibling of /giris, not nested under
                            ProtectedRoute, so it renders the same regardless
                            of auth state instead of bouncing through a
                            redirect first. */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                      </PasswordRecoveryGate>
                    </Suspense>
                  </ErrorBoundary>
                </HashRouter>
              </UnreadActivityProvider>
              </UnreadMessagesProvider>
            </PresenceProvider>
          </UserSettingsProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
