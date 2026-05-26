# README Auth & Roles ArahLoka

## 1. Ringkasan Platform
ArahLoka adalah platform **Tourism & Culture Exchange** yang menghubungkan **penyedia jasa travel/local guide** (producer) dengan **turis/wisatawan** (consumer). Platform ini memadukan rekomendasi destinasi budaya, penawaran wisata, booking, dan catatan perjalanan.

## 2. Tujuan Fitur Autentikasi
Fitur register/login dibuat agar:
- akses platform hanya untuk pengguna yang valid,
- setiap pengguna masuk ke fitur sesuai perannya,
- akun baru harus disetujui dulu oleh superadmin sebelum bisa mengakses dashboard.

## 3. Pembagian Role Pengguna

| Role | Tujuan | Fitur yang Diizinkan | Fitur yang Dibatasi |
|---|---|---|---|
| Superadmin | Pengelola akses platform | Melihat semua user, melihat pending user, approve/reject akun | Tidak register dari endpoint publik |
| Producer / Penyedia Jasa Travel | Menyediakan penawaran wisata budaya | Buat/edit/nonaktifkan penawaran, upload media, kelola booking penawarannya | Tidak bisa akses endpoint admin/consumer |
| Consumer / Turis | Menggunakan layanan wisata | Lihat rekomendasi, lihat penawaran, booking, lihat booking sendiri, catat journey log | Tidak bisa kelola user/admin dan offer producer |

## 4. Alur Registrasi dan Approval
1. Pengguna melakukan register (role hanya `producer` atau `consumer`).
2. Sistem menyimpan akun dengan status `pending`.
3. Superadmin membuka dashboard dan meninjau akun pending.
4. Superadmin memilih **Approve** atau **Reject**.
5. Akun `approved` bisa login dan masuk dashboard sesuai role.
6. Akun `pending`/`rejected` tidak bisa mengakses dashboard protected.

## 5. Alur Login
1. Pengguna mengirim email dan password.
2. Backend validasi:
   - email ada/tidak,
   - password hash cocok/tidak,
   - status user (`pending`, `approved`, `rejected`).
3. Jika `approved`, backend mengirim JWT + data user.
4. Frontend menyimpan token, lalu route user ke dashboard:
   - superadmin -> Superadmin Dashboard
   - producer -> Producer Dashboard
   - consumer -> Consumer Dashboard

## 6. Superadmin Dashboard
Fitur utama:
- **Pending User Approvals** (approve/reject),
- **All Users** (nama, email, role, status, created_at),
- **Role Permission Matrix** untuk dokumentasi hak akses.

## 7. Producer Dashboard
Fitur utama:
- Create Cultural Travel Offer,
- Upload image/media penawaran,
- My Offers,
- Bookings for My Offers,
- Tombol **Nonaktifkan Penawaran** / **Aktifkan Kembali**.

## 8. Consumer Dashboard
Fitur utama:
- Rekomendasi destinasi,
- Featured Cultural Gems,
- Available Cultural Travel Offers,
- Booking form + My Bookings,
- Record Your Journey + Community Journey Logs.

## 9. Backend API Summary
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/admin/users`
- `GET /api/admin/users/pending`
- `PATCH /api/admin/users/:id/approve`
- `PATCH /api/admin/users/:id/reject`
- `GET /api/offers`
- `POST /api/offers`
- `GET /api/producer/offers`
- `POST /api/bookings`
- `GET /api/my-bookings`
- `GET /api/producer/bookings`
- `PATCH /api/bookings/:id/status`

## 10. Database Tables
- `users`: akun, password hash, role, status approval.
- `offers`: penawaran wisata budaya dari producer.
- `bookings`: data booking consumer ke offer tertentu.
- `saved_trips`: catatan perjalanan komunitas (legacy + tetap dipakai).
- `destinations`: data destinasi untuk rekomendasi dan cuaca.
- `media_files`: **tidak ada tabel khusus** saat ini; path media offer disimpan di `offers.image_url`.

## 11. Testing Guide
1. Login superadmin  
   - email: `admin@arahloka.test`  
   - password: `Admin123!`
2. Register akun producer.
3. Approve producer dari superadmin dashboard.
4. Login producer.
5. Buat offer + upload image.
6. Register akun consumer.
7. Approve consumer dari superadmin dashboard.
8. Login consumer.
9. Booking offer.
10. Login producer lagi dan accept/reject booking.

## 12. Screenshot Checklist for Report
- Login page
- Register page
- Pending approval message
- Superadmin dashboard
- Pending user table
- User approval action
- Producer dashboard
- Create offer form
- My offers
- Consumer dashboard
- Available offers
- Booking form
- My bookings
- Producer booking management

## 13. Penjelasan untuk Laporan
Pada ArahLoka, sistem autentikasi diterapkan untuk memastikan hanya pengguna yang telah terdaftar dan disetujui superadmin yang dapat mengakses fitur platform. Pengguna dibagi menjadi tiga role, yaitu superadmin, producer, dan consumer. Superadmin bertugas mengelola akses pengguna, producer berperan sebagai penyedia jasa travel yang membuat penawaran wisata budaya, sedangkan consumer berperan sebagai turis yang melihat rekomendasi, melakukan booking, dan mencatat pengalaman perjalanan.
