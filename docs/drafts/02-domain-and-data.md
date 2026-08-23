# Draft 02: Domain And Data

## Core Entities

### Job Title

Hiring need dengan job description, competency, minimum experience, minimum education, dan status pipeline.

### Candidate

Profil orang yang dapat berasal dari satu atau lebih resume document dan dapat terkait ke banyak job title.

### Application

Relasi candidate dengan satu job title. Entity ini memiliki current status, tanggal dibuat, dan status history.

### Resume Document

File CV asli yang di-upload user dan disimpan private di Google Cloud Storage.

### Extraction

Data terstruktur yang dihasilkan dari pembacaan resume document.

### Validation

Pemeriksaan extraction, termasuk confidence, konflik, field yang perlu direview, dan evidence.

### Recommendation

Saran AI yang menghubungkan candidate dengan job title. Recommendation bukan application.

### Processing Job

Pekerjaan pemrosesan asynchronous untuk extraction, validation, atau recommendation.

## Important Relationships

```text
User -> uploads -> Resume Document
Resume Document -> produces -> Extraction
Extraction -> is checked by -> Validation
Candidate -> has -> Resume Document
Candidate -> has many -> Application
Application -> belongs to -> Job Title
Application -> has one current -> Status
Application -> has many -> Status History
Candidate -> receives -> Recommendation
Recommendation -> may be confirmed into -> Application
```

## Candidate Deduplication

Prioritas matching awal:

1. Email yang sama.
2. Nomor telepon yang sama.
3. Nama plus bukti tambahan jika kontak tidak tersedia.
4. Review manual ketika confidence rendah.

Retry processing harus idempotent dan tidak boleh membuat candidate atau application duplikat.

## Status Ownership

Status dikonfigurasi per job title. Contoh status: `Pending`, `Screening`, `Interview 1`, `Interview 2`, `Offer`, `Hired`, dan `Rejected`.

Application Finance dan Application Accounting untuk candidate yang sama boleh memiliki status berbeda.

## Data Provenance

Untuk field penting, sistem perlu membedakan:

- nilai yang ditemukan dari resume document;
- nilai yang dinormalisasi AI;
- perubahan manual recruiter;
- evidence berupa potongan teks atau nomor halaman.

## Delete Semantics

MVP menggunakan soft delete untuk candidate dan application bila memungkinkan. Penghapusan harus menjelaskan apakah resume document dan application terkait ikut dihapus, dipertahankan, atau dianonimkan.

See also: [PRD](../../PRD.md), [AI Draft](./04-ocr-and-ai.md), [Context Glossary](../../CONTEXT.md).
