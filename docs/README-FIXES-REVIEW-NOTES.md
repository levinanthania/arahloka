# Perbaikan ArahLoka Berdasarkan Review Notes

## 1) Perbaikan Itinerary
- Itinerary tidak lagi dibagi menjadi `itinerary / preparation / note` pada UI.
- Sekarang semua input disederhanakan menjadi **Itinerary Perjalanan**.
- Di backend, kolom `item_type` tetap ada untuk kompatibilitas database lama, tetapi data baru disimpan sebagai `itinerary`.

## 2) Perbaikan Edit Offer
- Tombol **Edit Penawaran** sekarang benar-benar tersambung ke form edit.
- Form edit muncul **tepat di bawah card penawaran yang dipilih**.
- Hanya satu form edit aktif pada satu waktu.
- Field edit:
  - Judul, lokasi, deskripsi, kategori, durasi, harga, kuota, latitude, longitude
  - upload gambar/media baru
  - status penawaran (Aktif / Nonaktif)
  - itinerary perjalanan
- Tombol: **Simpan Perubahan** dan **Batal**.

## 3) Rating Offer
- My Offers dan Available Offers sekarang menampilkan rating:
  - contoh: `Rating: 4.8 ★ (5 ulasan)`
  - jika belum ada data: `Belum ada rating`
- Rating dihitung dari data `saved_trips.rating` yang cocok dengan judul penawaran (`destination_name = offer.title`) untuk pendekatan sederhana dan aman.

## 4) Consumer UI Lebih Ringkas
- Kotak besar “Consumer Dashboard” di bagian atas dihapus.
- Halaman consumer langsung fokus ke fitur utama:
  - Start Your Journey
  - Featured Cultural Gems
  - Available Cultural Travel Offers
  - My Bookings
  - Record Your Journey
  - Community Journey Logs

## 5) Emoji pada Opsi Rekomendasi
- Opsi mood/duration/interest/style kembali memakai emoji:
  - 🌿, 🎭, 🌋, 🍲, 📜
  - 🕒, ☀️, 🌅, ✨
  - 🍃, 🤝, 🏛️, 🌶️, 🛖
  - 🧘, ⚖️, 🧭
- Value backend tetap kompatibel (`healing`, `one day`, `nature`, dll).

## 6) Gambar dan Info Eksternal
- Gambar destinasi mendukung source eksternal:
  1. Google Custom Search JSON API (jika env tersedia)
     - `GOOGLE_CSE_API_KEY`
     - `GOOGLE_CSE_ID`
  2. fallback Wikimedia/Wikipedia API
  3. fallback local/static
- Tidak ada scraping Google Images HTML.
- Tambah endpoint info eksternal:
  - `GET /api/destination-info?name=...`
  - source: `wikipedia / local / fallback`
- Frontend menampilkan ringkasan external info saat tersedia.

## 7) Perbaikan Booking Flow
- Tombol **Booking Pengalaman Ini** sekarang mengarah ke **form booking khusus** (section terdedikasi), bukan form yang selalu tampil di bawah semua offer.
- Judul form: `Booking: <offer title>`.
- Ada tombol balik: **Kembali ke Penawaran**.

## 8) Status Booking Langsung Berhasil
- Booking valid langsung disimpan sukses tanpa approval producer manual.
- UI menampilkan booking sebagai **Terkonfirmasi**.
- UI producer untuk accept/reject booking dihapus dari frontend.

## 9) Checklist Kesiapan Tetap Aktif
- Setelah booking berhasil, checklist kesiapan trip otomatis dibuat.
- Consumer bisa buka **Checklist Kesiapan**, centang item, dan lihat rekap:
  - persentase kesiapan
  - sudah siap
  - masih perlu disiapkan
  - label kesiapan.

## 10) Screenshot yang Disarankan
1. Login producer
2. Form Create Offer + Itinerary Perjalanan
3. Edit Penawaran + preview gambar lama
4. My Offers (status + rating + checklist count)
5. Form edit muncul tepat di bawah card saat klik Edit Penawaran
6. Login consumer (tanpa kotak Consumer Dashboard besar)
7. Form rekomendasi dengan emoji
8. Kartu penawaran (gambar + rating + sumber fallback API)
9. Klik Booking Pengalaman Ini -> form booking khusus
10. Booking berhasil (Terkonfirmasi)
11. Checklist Kesiapan + rekap
