"""OCR worker used by the Node app when OCR_RUNTIME=python.

Reads a PDF path from argv, renders each page with pypdfium2, OCRs with
pytesseract, and prints JSON to stdout:

  {"pages": [{"page": 1, "text": "..."}]}

Requires: pypdfium2, pillow, pytesseract (see requirements.txt) and a system
tesseract binary (brew install tesseract on macOS).
"""

import json
import sys

import pypdfium2 as pdfium
from PIL import Image, ImageOps
import pytesseract
from pytesseract import Output


def render_page(page, scale: float = 3.0) -> Image.Image:
    bitmap = page.render(scale=scale)
    pil = bitmap.to_pil()
    if pil.mode in ("RGBA", "LA") or (pil.mode == "P" and "transparency" in pil.info):
        alpha = pil.convert("RGBA").split()[-1]
        bg = Image.new("RGB", pil.size, (255, 255, 255))
        bg.paste(pil.convert("RGB"), mask=alpha)
        return bg
    return pil.convert("RGB")


def ocr_page(image: Image.Image) -> str:
    """Use the most legible result from common resume layouts."""
    prepared = ImageOps.autocontrast(ImageOps.grayscale(image))
    candidates = []
    for variant in (image, prepared):
        for config in ("--psm 6", "--psm 11"):
            data = pytesseract.image_to_data(
                variant,
                config=config,
                output_type=Output.DICT,
            )
            recognized = []
            lines = {}
            for text, confidence, block, paragraph, line in zip(
                data["text"],
                data["conf"],
                data["block_num"],
                data["par_num"],
                data["line_num"],
            ):
                text = text.strip()
                confidence = float(confidence)
                if text and confidence >= 0:
                    recognized.append((text, confidence))
                    lines.setdefault((block, paragraph, line), []).append(text)
            if recognized:
                score = sum(confidence for _, confidence in recognized) / len(
                    recognized
                )
                text = "\n".join(" ".join(words) for words in lines.values())
                candidates.append((score, text))
    if not candidates:
        return ""
    return max(candidates, key=lambda candidate: (candidate[0], len(candidate[1])))[1]


def main(pdf_path: str) -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: ocr_worker.py <pdf-path>")
    pdf = pdfium.PdfDocument(pdf_path)
    pages = []
    for i in range(len(pdf)):
        page = pdf[i]
        image = render_page(page)
        pages.append({"page": i + 1, "text": ocr_page(image)})
    print(json.dumps({"pages": pages}))


if __name__ == "__main__":
    main(sys.argv[1])
