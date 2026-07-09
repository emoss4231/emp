# Advanced HitBot Master Dashboard - TODO

## Veritabanı & Backend
- [x] Veritabanı şeması: simulations tablosu
- [x] Veritabanı şeması: workers tablosu
- [x] Veritabanı şeması: proxies tablosu
- [x] Veritabanı şeması: behavior_profiles tablosu
- [x] Veritabanı şeması: analytics_config tablosu
- [x] Veritabanı şeması: system_config tablosu
- [x] Veritabanı şeması: simulation_results tablosu
- [x] Veritabanı şeması: anti_detect_settings tablosu
- [x] tRPC Router: Simülasyon CRUD (oluşturma, listeleme, güncelleme, silme, başlatma/durdurma)
- [x] tRPC Router: Worker CRUD (listeleme, ekleme, güncelleme, silme)
- [x] tRPC Router: Proxy CRUD (ekleme, toplu ekleme, silme, istatistikler)
- [x] tRPC Router: Davranış profilleri (listeleme, güncelleme)
- [x] tRPC Router: Anti-tespit ayarları (okuma/güncelleme)
- [x] tRPC Router: Analitik entegrasyon ayarları (okuma/güncelleme)
- [x] tRPC Router: Sistem konfigürasyonu (okuma/güncelleme)
- [x] tRPC Router: Raporlama (listeleme, özet istatistikler)
- [x] tRPC Router: Dashboard istatistikleri
- [x] WebSocket: Canlı metrik akışı (2 saniyede bir broadcast)
- [x] WebSocket: Worker durumu gerçek zamanlı güncellemeler

## Frontend Sayfaları
- [x] Tema: Koyu tema, kırmızı vurgu, Inter + JetBrains Mono
- [x] AppLayout: Üst navigasyon + kimlik doğrulama
- [x] Dashboard: KPI kartları + Recharts trafik grafiği + canlı log paneli
- [x] Simülasyon: Görev oluşturma formu + liste + başlat/durdur/sil
- [x] Worker: Worker ekleme + kart görünümü + CPU/Bellek progress barları
- [x] Proxy: Tekli/toplu ekleme + tablo + istatistik kartları
- [x] Anti-Tespit: 14 toggle (kategorize edilmiş)
- [x] Davranış Profilleri: 7 profil kartı + slider/select ayarları
- [x] Analitik: GA4 + GTM + FB Pixel + olay tetikleyiciler
- [x] Sistem Konfigürasyonu: Performans + Güvenlik + Ağ + Hız Sınırlandırma
- [x] Raporlama: Tablo + PieChart + BarChart + CSV/JSON export (client-side)
- [x] Kullanıcı kimlik doğrulama (Manus OAuth)

## Kalite & Test
- [x] Vitest: 4 test geçti (router keys, auth.logout, auth.me)
- [x] TypeScript: 0 hata
- [x] WebSocket: Otomatik yeniden bağlanma + HTTP polling fallback

## Worker Engine & API Entegrasyonu
- [x] Worker Engine: SERP tıklama manipülasyonu motoru
- [x] Google arama simülasyonu (anahtar kelime arama + hedef siteye tıklama)
- [x] Proxy rotasyon entegrasyonu (7 strateji)
- [x] Fingerprint Generator: User-Agent, ekran, dil, timezone rastgeleleştirme
- [x] İnsan Davranışı Simülatörü: Kaydırma, tıklama, fare hareketi
- [x] Worker API: Simülasyon başlatma/durdurma endpoint'leri
- [x] Canlı sonuç raporlama (log akışı + metrics)
- [x] Frontend: Başlat/Durdur butonlarının gerçek motora bağlanması
- [x] Simülasyon sonuçlarının veritabanına kaydedilmesi

## Mod Ayarları & Worker Engine
- [x] Simülasyon modları ekleme (Agresif/Normal/Güvenli/Özel)
- [x] Her mod için parametre seti (saatlik tıklama, pogo-sticking oranı, kalma süresi vb.)
- [x] Mod değişimi UI (panel üzerinden mod seçimi ve parametre düzenleme)
- [x] Worker Engine: SERP tıklama manipülasyonu motoru
- [x] Worker Engine: Rakip pogo-sticking mantığı
- [x] Worker Engine: Proxy rotasyonu ve fingerprint yönetimi
- [x] Worker Engine: Agresif mod desteği (yüksek hacim)
- [x] Panele Başlat/Durdur entegrasyonu
