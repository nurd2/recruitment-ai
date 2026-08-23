# Draft 03: UX And Workflows

## Primary Navigation

- Job Titles
- Candidate Pool
- Upload CV
- Processing Jobs atau Notifications

Candidate Pool dapat ditunda jika MVP hanya membutuhkan candidate yang sudah terkait ke job title.

## Workflow A: Create Job Title

1. User membuka daftar job title.
2. User memilih Create job title.
3. User mengisi nama, job description, competency, minimum experience, dan minimum education.
4. User mengatur status pipeline atau memakai default.
5. Sistem memvalidasi field wajib dan menyimpan job title aktif.

## Workflow B: Upload Without Job Title

1. User upload PDF atau DOCX.
2. UI menampilkan processing state.
3. Sistem melakukan text extraction atau OCR.
4. AI memvalidasi extraction dan menampilkan confidence serta evidence.
5. User memperbaiki atau mengonfirmasi data kandidat.
6. UI menampilkan recommendation job title beserta alasan dan gap.
7. User memilih satu job title atau menolak semua.
8. Sistem membuat application hanya setelah pilihan dikonfirmasi.

## Workflow C: Upload From Job Title

1. User membuka `/job-title/[id]`.
2. User upload CV.
3. Job title menjadi context untuk recommendation dan validation.
4. User review data kandidat.
5. Sistem melakukan deduplication check.
6. Sistem membuat application dengan status awal setelah konfirmasi.

## Job Title Detail

Route: `/job-title/[id]`

Tabel minimum:

- nama kandidat;
- usia jika tersedia;
- total tahun pengalaman;
- status application;
- tanggal ditambahkan;
- action menu.

Action minimum:

- change status;
- buka detail candidate;
- edit candidate;
- buka atau download resume document;
- remove dari job title atau delete sesuai hak akses.

## States

Setiap upload perlu memiliki state yang terlihat:

- `Queued`
- `Processing`
- `Needs Review`
- `Ready`
- `Failed`

UI harus menyediakan retry untuk `Failed` dan tidak menampilkan hasil parsial sebagai data final.

## Usability And Accessibility

- Form memiliki validasi inline dan pesan error yang jelas.
- Action menu dapat digunakan dengan keyboard.
- Tabel menggunakan pagination dan filter status.
- Status change membutuhkan feedback sukses atau error.
- Delete menggunakan confirmation dialog.
- Confidence rendah harus mudah ditemukan tanpa membanjiri tampilan.

See also: [Product Scope](./01-product-scope.md), [PRD](../../PRD.md).
