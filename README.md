# Monitoring Distribusi (PWA)

Aplikasi web statis tanpa build. Bisa dipasang di HP lewat "Tambahkan ke layar utama".

## Deploy: GitHub + Vercel
1. Buat repo baru di github.com/new, lalu unggah SEMUA isi folder ini (index.html harus berada di root repo).
2. Buka vercel.com/new, masuk dengan GitHub, pilih repo ini, klik Import.
3. Framework Preset: Other. Kosongkan Build Command dan Output Directory. Klik Deploy.
4. Setiap perubahan yang di-commit ke branch utama akan otomatis dideploy ulang.

## Dengan Git (opsional)
    git init && git add . && git commit -m "versi awal"
    git branch -M main
    git remote add origin https://github.com/USERNAME/distribusi-app.git
    git push -u origin main

## Catatan
- Data dan akun disimpan di browser perangkat (localStorage). Tidak ada cadangan otomatis; jika data browser dihapus, data hilang.
- Login hanya untuk perangkat ini; belum ada server.
- Log aktivitas (menu Aktivitas) juga tersimpan di browser perangkat ini, maksimal 1.000 catatan terbaru.
- Paket Vercel Hobby hanya untuk pemakaian pribadi nonkomersial.

## Lisensi
MIT License. Hak cipta (c) 2026 Septa Aji. Lihat berkas LICENSE.
