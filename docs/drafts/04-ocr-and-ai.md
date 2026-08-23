# Draft 04: OCR And AI

## Processing Pipeline

```text
Upload
  -> Validate file
  -> Store original document
  -> Extract text layer when available
  -> Run OCR for scanned pages when needed
  -> Parse structured candidate data
  -> Validate with AI
  -> Generate job title recommendations
  -> Request recruiter review
```

## Supported Inputs

MVP mendukung PDF dan DOCX. File asli disimpan sebagai Resume Document. Tipe file, ukuran, checksum, uploader, dan timestamp disimpan sebagai metadata.

## Extraction Fields

- nama lengkap;
- email dan nomor telepon;
- alamat atau lokasi;
- tanggal lahir atau usia jika tersedia;
- ringkasan profil;
- pendidikan;
- work experience: perusahaan, jabatan, periode, dan deskripsi;
- skill atau competency;
- sertifikasi;
- bahasa;
- portfolio atau professional profile.

Field yang tidak tersedia harus kosong atau `unknown`. Model tidak boleh mengarang nilai.

## OCR Strategy

- Gunakan text layer PDF lebih dahulu jika tersedia.
- Gunakan OCR lokal gratis seperti Tesseract untuk scanned document bila sesuai.
- Simpan hasil text extraction dan metadata halaman untuk evidence.
- Tandai dokumen yang gagal dibaca atau memiliki kualitas rendah sebagai `Needs Review`.

## Validation Output

AI menghasilkan:

- normalized value;
- confidence per field;
- conflict list;
- field yang wajib direview;
- evidence berupa text snippet atau page reference;
- error yang aman jika provider gagal.

Hasil AI selalu draft sampai recruiter mengonfirmasi atau mengeditnya.

## Recommendation Output

Setiap recommendation memuat:

- job title;
- alasan utama;
- competency atau skill yang cocok;
- experience fit;
- education fit;
- gap atau kriteria yang belum terpenuhi;
- confidence atau score dengan label bantuan.

Recommendation tidak boleh menjadi dasar auto-reject atau auto-hire.

## Provider Abstraction

Provider yang didukung:

- OpenAI-compatible custom provider atau AI proxy/router;
- Gemini API;
- DeepSeek API.

Internal schema harus sama antar provider. Simpan provider, model, timestamp, token atau usage metadata jika tersedia, dan prompt/schema version.

## Failure Handling

- Gunakan retry terbatas untuk error transient.
- Tandai processing job sebagai `Failed` setelah retry habis.
- Sediakan fallback provider hanya bila konfigurasi mengizinkan.
- Retry tidak boleh membuat candidate atau application baru.
- Jangan menampilkan output parsial sebagai final.

## Responsible AI Constraints

Alamat, usia, dan data pribadi lain tidak boleh digunakan untuk scoring tanpa kebijakan eksplisit. Data yang dikirim ke provider eksternal perlu mengikuti kebijakan privasi organisasi.

See also: [Domain And Data](./02-domain-and-data.md), [Security Draft](./05-security-and-nfr.md), [PRD](../../PRD.md).
