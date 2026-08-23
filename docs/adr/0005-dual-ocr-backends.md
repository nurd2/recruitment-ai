# Dual OCR backends selected by OCR_RUNTIME

Scanned PDFs are OCR'd by one of two backends, chosen at runtime by the `OCR_RUNTIME` env var: a self-contained Node path (pdfjs render + tesseract.js WASM) or a Python worker (pypdfium2 + pytesseract). Both return the same shape so the pipeline is runtime-agnostic. The Node path has no system dependencies; the Python path is more accurate for difficult scans. Cloud OCR was rejected for cost and data-privacy reasons.
