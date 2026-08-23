# Draft 05: Security And Non-Functional Requirements

## Data Protection

- Resume document disimpan pada private Google Cloud Storage bucket.
- File diakses melalui signed URL berumur pendek atau endpoint terproteksi.
- User hanya dapat melihat file sesuai authorization.
- API key provider AI tidak boleh dikirim ke browser atau disimpan di source code.
- Data pribadi yang dikirim ke AI provider harus mengikuti policy organisasi.

## Authorization

MVP memiliki dua role:

- **Admin** dapat menambahkan user, menetapkan atau mengubah role, menonaktifkan user, mengelola konfigurasi AI, dan mengelola seluruh data recruitment.
- **Recruiter** dapat mengelola job title, candidate, application, CV, dan status pipeline, tetapi tidak dapat mengelola user atau konfigurasi akses.

Authorization wajib diperiksa di server-side pada setiap route atau action yang sensitif. UI tidak boleh menjadi satu-satunya lapisan pembatasan.

Sistem tidak boleh menonaktifkan atau menghapus Admin terakhir tanpa ada Admin pengganti.

Tenant isolation dan granular permission per job title tetap menjadi keputusan terbuka.

## Auditability

Catat actor dan timestamp untuk:

- perubahan data candidate;
- konfirmasi extraction atau validation;
- pembuatan dan perubahan application;
- perubahan status;
- upload, akses, dan penghapusan resume document;
- konfigurasi provider AI.

## Reliability

- Processing job memiliki state machine yang eksplisit.
- Job retry harus idempotent.
- Error memiliki error code dan correlation id.
- Provider timeout dan rate limit harus ditangani.
- Data final tidak boleh tertimpa output AI tanpa tindakan user.

## Performance

- Tabel kandidat menggunakan pagination.
- Upload tidak memblokir halaman terlalu lama.
- Pemrosesan OCR dan AI berjalan asynchronous.
- Halaman detail job title memuat data kandidat secara bertahap bila diperlukan.

## Accessibility

Form, table, dialog, action menu, status control, dan upload control harus dapat digunakan dengan keyboard, memiliki label, dan menyediakan feedback yang dapat dipahami screen reader.

## Privacy And Retention

Dokumen dan data kandidat harus memiliki aturan retention, penghapusan, dan pemulihan yang jelas. Soft delete direkomendasikan pada MVP agar kesalahan user dapat dipulihkan.

## Observability

Minimal ukur:

- jumlah CV per provider;
- processing duration;
- extraction failure rate;
- validation failure rate;
- recommendation failure rate;
- retry count;
- token atau cost metadata jika tersedia.

See also: [AI Draft](./04-ocr-and-ai.md), [PRD](../../PRD.md).
