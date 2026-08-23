# Draft 06: Delivery And Open Decisions

## Suggested Delivery Slices

### Slice 1: Hiring Setup

Job title CRUD, criteria, default status, custom status, dan detail job title kosong.

### Slice 2: Candidate Intake

Upload PDF/DOCX, private storage, document metadata, dan processing state.

### Slice 3: Extraction Review

Text extraction, OCR fallback, structured extraction, confidence, evidence, dan manual correction.

### Slice 4: AI Recommendation

Provider adapter, validation, recommendation, provider metadata, retry, dan recruiter confirmation.

### Slice 5: Pipeline Monitoring

Application creation, candidate table, filter, status change dari action table, dan status history.

### Slice 6: Data Management

Candidate detail, edit, delete/soft delete, deduplication review, dan audit trail.

## Open Product Decisions

1. Apakah MVP single-tenant atau multi-tenant?
2. Berapa batas ukuran file dan jumlah CV dalam satu batch?
3. Apakah usia atau tanggal lahir hanya ditampilkan atau dipakai dalam recommendation?
4. Field apa yang tidak boleh dikirim ke provider AI eksternal?
5. Apakah candidate pool tanpa application dibutuhkan sejak MVP?
6. Apakah status memiliki aturan transisi?
7. Bagaimana retention dan pemulihan dokumen?
8. Provider AI default dan aturan fallback apa yang dipilih?
9. Apakah evidence nomor halaman wajib untuk semua field penting?

## Recommended Baseline For Prototype

Agar implementasi awal dapat bergerak, gunakan baseline berikut sampai keputusan final tersedia:

- single-tenant;
- dua role internal: Admin dan Recruiter;
- hanya Admin yang dapat menambahkan atau mengelola user;
- authorization diperiksa server-side;
- upload satu CV per proses;
- PDF dan DOCX;
- Tesseract atau text extraction lokal sebagai OCR baseline;
- provider AI dipilih dari server-side configuration;
- alamat dan usia ditampilkan tetapi tidak dipakai untuk scoring;
- recommendation memerlukan konfirmasi manual;
- status custom per job title;
- soft delete;
- candidate tanpa application disimpan di candidate pool.

## Definition Of Ready For Implementation

Implementasi dianggap siap dimulai ketika baseline di atas diterima atau diganti, schema extraction sudah disepakati, status processing sudah jelas, dan aturan candidate/application sudah tidak ambigu.

See also: [PRD](../../PRD.md), [Product Scope](./01-product-scope.md).
