# Guess the Future (GTF)

Bugün bir tahmin mühürle, zamanı gelince haklı olduğunu kanıtla. Sosyal tahmin
platformu — web, Android ve iOS tek kod tabanından (React + Vite + Capacitor,
arka uç Supabase).

- **Web (beta):** https://guess-the-future.vercel.app
- **Android:** Capacitor kabuğu (`android/`), imzalı APK/AAB için `android/keystore.properties` gerekir (git dışı)
- **iOS:** Capacitor kabuğu (`ios/`), Codemagic üzerinden TestFlight'a derlenir (`codemagic.yaml`)

## Geliştirme

```bash
npm install
cp .env.example .env   # Supabase URL/anahtarı ve VITE_APP_URL'yi doldur
npm run dev            # http://localhost:5173
npm test               # vitest
npm run lint           # oxlint
npm run build          # dist/
```

Native kabukları güncellemek için derlemeden sonra `npx cap sync android` /
`npx cap sync ios` (iOS için macOS gerekir; Codemagic bunu bulutta yapıyor).

## Yapı

- `src/screens/` ekranlar, `src/components/` paylaşılan parçalar, `src/lib/` saf yardımcılar
- `src/i18n/` 8 dil (tr, en, de, zh, ja, ru, es, ar)
- `supabase/schema.sql` yalnızca sona eklenen şema; `supabase/functions/` Edge Function'lar
- `DESIGN.md` tasarım dili ve bileşen kalıpları, `docs/designs/` özellik tasarım notları

## Dağıtım

Web, `main` dalına her push'ta Vercel tarafından otomatik yayınlanır. iOS
derlemesi aynı push'la Codemagic'te tetiklenir. Ortam değişkenleri
(`VITE_*`) her iki serviste de ayrıca tanımlıdır; yerel `.env` git dışıdır.
