# RagBase domain glossary

## Source

An uploaded file or pasted URL that RagBase reads into the workspace knowledge base. Sources move through statuses: queued (`pending`), reading (`processing`), ready, or failed (`error`).

## Ingestion failure

When reading a Source fails. The failure is classified by an **ingestion failure category** (for example `ocr_over_cap`, `blocked_url`) and surfaced to the user with recovery guidance.

## Ingestion failure category

A typed label for why a Source failed. Written once when the pipeline catches an error, stored on the Source metadata, and read by the UI and analytics without re-parsing error text.

## OCR

Optical character recognition for scanned PDFs with little embedded text. Free tier uses Firecrawl; bring-your-own-key tier uses OpenRouter vision.

## PDF ingestion path

Reading a PDF file: probe the buffer for embedded text, run OCR when the scan is image-heavy, then produce page segments for chunking. The pipeline coordinates Source status; the path module owns probe → OCR → segments.

## OCR provider adapter

A seam behind OCR that returns normalized per-page text (`PdfPage[]`) regardless of whether Firecrawl or OpenRouter vision performed the extraction.
