# Food Crawler Service

Türk Gıda Kompozisyonu verilerini çeken ve veritabanına kaydeden microservice.

## Özellikler

- Türk Gıda Kompozisyonu veritabanından gıda verilerini otomatik çekme
- BullMQ ile kuyruk tabanlı işlem yönetimi
- PostgreSQL veritabanı entegrasyonu
- Redis cache desteği
- RESTful API endpoints
- İlerleme takibi

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm install
```

2. Environment dosyasını oluşturun:
```bash
cp env.example .env
```

3. Veritabanı ayarlarını yapılandırın

4. Uygulamayı başlatın:
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## API Endpoints

### Crawler İşlemleri

- `POST /crawler/start-full-crawl` - Tüm gıda verilerini çek
- `POST /crawler/start-category-crawl` - Belirli kategori için veri çek
- `POST /crawler/update-existing` - Mevcut verileri güncelle

### İş Durumu

- `GET /crawler/job/:jobId` - Belirli işin durumunu kontrol et
- `GET /crawler/jobs` - Tüm işleri listele

## Kullanım

### Tam Veri Çekme
```bash
curl -X POST http://localhost:3001/crawler/start-full-crawl
```

### Kategori Bazlı Çekme
```bash
curl -X POST http://localhost:3001/crawler/start-category-crawl \
  -H "Content-Type: application/json" \
  -d '{"category": "Meyveler"}'
```

### İş Durumu Kontrolü
```bash
curl http://localhost:3001/crawler/job/{jobId}
```

## Veritabanı Şeması

`foods` tablosu aşağıdaki alanları içerir:

- `turkompId`: Türk Gıda Kompozisyonu ID'si
- `name`: Gıda adı
- `nameEn`: İngilizce gıda adı
- `category`: Kategori
- `subCategory`: Alt kategori
- Besin değerleri (enerji, protein, karbonhidrat, yağ, vitaminler, mineraller)

## Geliştirme

```bash
# TypeScript derleme
npm run build

# Development mode
npm run dev

# Linting
npm run lint
```

## Notlar

- Crawler servisi rate limiting ile çalışır
- Veriler otomatik olarak güncellenir
- Hata durumunda otomatik retry mekanizması vardır
- İlerleme durumu Redis üzerinden takip edilir
