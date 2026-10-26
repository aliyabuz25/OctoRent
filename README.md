# OctoRent

OctoRent — Müasir Ağıllı İcarə və Stok İdarəetmə Sistemi (React Web, Ionic Mobil Tətbiq, Express API və QR Cihaz Eşləməsi).

## Əsas Xüsusiyyətlər

- **Desktop İdarəetmə Paneli:** Windows Explorer üslubunda təmiz ağac naviqasiyası (Tree View), sürətli axtarış, filtrasiya və Tabulator cədvəlləri.
- **İcarə və Faktura İdarəetməsi:** Günlük və aylıq kirayə müqavilələri, təhvil-təslim statusu, avtomatik PDF faktura çıxarışı.
- **Mobil Tətbiq (`/mobile`):** iOS SwiftUI sadəliyində tək tonlu təmiz interfeys, barkod/QR skaneri və real-vaxt bildirişlər.
- **Sürətli QR Cihaz Eşləməsi:** Şifrə yazmadan masaüstü ekrandakı QR kodu skan edərək dərhal və təhlükəsiz mobil giriş.
- **Maliyyə & Kassa:** Kassa mədaxil/məxaric qeydləri, servis & təmir modulu və analitik qrafiklər.

## Tələblər

- Node.js 20+
- Redis (default `127.0.0.1:6379`)

## Quraşdırma və Başlatma

```sh
npm install
npm run dev
```

`npm run dev` həm API-ni (`http://localhost:3001`), həm də veb müştərini (`http://localhost:5173`) işə salır.

### Əmrlər

| Əmr | Təsvir |
| --- | --- |
| `npm run dev` | API və Desktop veb tətbiqini başladır |
| `npm run dev:mobile` | Mobil Ionic tətbiqini müstəqil portda (5174) başladır |
| `npm run dev:all` | Bütün xidmətləri paralel başladır |
| `npm run build` | Desktop veb tətbiqini istehsal üçün yığır |
| `npm run build:mobile` | Mobil tətbiqi istehsal üçün yığır |
| `npm run server` | Yalnız API serverini başladır |

## Layihə Strukturu

```text
src/                 Veb və mobil React komponentləri
  components/        Masaüstü modulları, cədvəllər və dialoqlar
  mobile/            Ionic mobil səhifələri, UI və API müştərisi
  styles/            CSS və tema stilləri
server/              Express REST API və Redis sessiya idarəetməsi
docs/                Texniki sənədləşmə
```
