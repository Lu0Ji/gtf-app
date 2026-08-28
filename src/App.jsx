import { HashRouter, Routes, Route } from 'react-router-dom'
import TabLayout from './layouts/TabLayout.jsx'
import Anasayfa from './screens/Anasayfa.jsx'
import Gruplar from './screens/Gruplar.jsx'
import Mesajlar from './screens/Mesajlar.jsx'
import Kesfet from './screens/Kesfet.jsx'
import Profil from './screens/Profil.jsx'
import TahminOlustur from './screens/TahminOlustur.jsx'
import TahminKaydi from './screens/TahminKaydi.jsx'
import Sohbet from './screens/Sohbet.jsx'
import LiderlikTablosu from './screens/LiderlikTablosu.jsx'
import Rozetler from './screens/Rozetler.jsx'
import ProfilAyarlari from './screens/ProfilAyarlari.jsx'
import UygulamaAyarlari from './screens/UygulamaAyarlari.jsx'
import Hareketler from './screens/Hareketler.jsx'

export default function App() {
  return (
    <HashRouter>
      <Routes>
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
      </Routes>
    </HashRouter>
  )
}
