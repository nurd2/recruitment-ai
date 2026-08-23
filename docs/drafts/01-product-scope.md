# Draft 01: Product Scope

## Problem

Recruitment data tersebar di spreadsheet, folder CV, dan percakapan. Recruiter membutuhkan satu tempat untuk mengelola kebutuhan hiring, memproses CV, dan memonitor pipeline kandidat.

## Product Promise

Sistem membantu recruiter mengubah CV menjadi data kandidat yang dapat direview, memberi rekomendasi job title sebagai bantuan, dan menjaga keputusan akhir tetap berada di tangan recruiter.

## MVP Users

- **Admin**: menambahkan user, menetapkan role, menonaktifkan user, mengatur provider AI, dan memiliki akses penuh.
- **Recruiter**: membuat job title, upload CV, review hasil AI, memilih recommendation, mengubah status, edit, dan hapus. Recruiter tidak dapat mengelola user.

## Access Rule

Sistem hanya memiliki dua role MVP: `Admin` dan `Recruiter`. User management adalah kemampuan Admin; Recruiter tidak dapat menambahkan user lain, mengubah role, atau menonaktifkan user.

## MVP In Scope

1. CRUD job title.
2. Job description, competency, minimum experience, dan minimum education.
3. Custom status pipeline per job title.
4. Upload PDF dan DOCX.
5. Penyimpanan resume document di Google Cloud Storage.
6. Text extraction atau OCR.
7. Validasi hasil extraction menggunakan AI.
8. Recommendation job title.
9. Konfirmasi recruiter untuk membuat application.
10. Monitoring kandidat di `/job-title/[id]`.
11. Perubahan status, edit candidate, dan delete dengan konfirmasi.

## Explicit Product Rules

- AI memberi suggestion, bukan keputusan hiring.
- Recommendation tidak otomatis membuat application.
- Satu candidate dapat memiliki banyak application.
- Status berada pada application, bukan candidate global.
- Candidate tanpa application boleh disimpan untuk review berikutnya.

## Success Metrics

- 90% CV yang didukung menghasilkan draft data kandidat.
- Satu CV dapat sampai ke tahap review dalam kurang dari 2 menit, di luar waktu tunggu provider.
- Recruiter dapat memonitor kandidat tanpa spreadsheet tambahan.
- Tidak ada application yang dibuat tanpa konfirmasi recruiter.

## Non-Goals

Integrasi job board eksternal, candidate self-service portal, interview calendar, messaging automation, payroll, automatic rejection, fine-tuning model, dan recruitment analytics lanjutan.

See also: [PRD](../../PRD.md), [Domain Model](./02-domain-and-data.md), [Open Decisions](./06-delivery-and-open-decisions.md).
