# Bayan Run 2025 Doorprize Random Name Picker

Aplikasi web untuk pengundian doorprize secara acak, mendukung multi-winner, manajemen peserta & hadiah, serta tampilan display untuk proyektor. Dibangun dengan React, TypeScript, Vite, dan Tailwind CSS.

## Tech Stack

<p align="left">
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" alt="React" width="40" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" alt="TypeScript" width="40" />
  <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Vitejs-logo.svg/1200px-Vitejs-logo.svg.png" alt="Vite" width="40" />
  <img src="https://www.svgrepo.com/show/374118/tailwind.svg" alt="Tailwind CSS" width="40" />
  <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/eslint/eslint-original.svg" alt="ESLint" width="40" />
</p>

- **React**: Library UI untuk membangun antarmuka interaktif.
- **TypeScript**: Superset JavaScript dengan static typing.
- **Vite**: Build tool & dev server super cepat.
- **Tailwind CSS**: Utility-first CSS framework untuk styling responsif.
- **Framer Motion**: Animasi React modern.
- **Lucide React**: Icon SVG stylish.
- **PapaParse**: Parsing file CSV.
- **react-confetti**: Efek confetti untuk perayaan pemenang.

## Fitur Utama

- Manajemen peserta (tambah, hapus, import CSV/TXT)
- Manajemen hadiah (tambah, edit, hapus, quota)
- Pengundian acak single/multi-winner
- Export & print daftar pemenang
- Tampilan display khusus untuk proyektor
- Customisasi tema warna & logo event
- Lock/unlock kontrol admin

## Struktur Project

```
src/
  components/      // Komponen UI utama (DrawingArea, ParticipantManager, PrizeManager, dll)
  hooks/           // Custom hooks (useLocalStorage)
  pages/           // Halaman utama (AdminPage, DisplayPage)
  types/           // Tipe data TypeScript
  utils/           // Utility (animations, fileHandling)
public/
  celebration-sound.mp3 // (tambahkan file suara jika ingin efek suara)
```

## Cara Menjalankan Project

1. **Clone repository**
   ```sh
   git clone <repo-url>
   cd bayanrun-doorprize
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Jalankan development server**
   ```sh
   npm run dev
   ```
   Buka [http://localhost:5173](http://localhost:5173) di browser.

4. **Build untuk produksi**
   ```sh
   npm run build
   ```

5. **Preview hasil build**
   ```sh
   npm run preview
   ```