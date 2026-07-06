# Document Upload And Ingestion

## Supported Inputs

Phase 1:

- PDF.
- DOCX.
- TXT.
- Markdown.
- HTML.
- CSV.
- Images with OCR.

Phase 2:

- Google Docs.
- Google Drive.
- Notion import.
- Confluence import.
- Web URL.
- Slack/chat export.

## Upload Flow

1. Select files.
2. Choose space/collection.
3. Choose visibility.
4. Choose AI indexing on/off.
5. Upload.
6. Parse.
7. Extract text, tables, images/OCR.
8. Generate title/summary/tags.
9. Detect duplicates.
10. Preview.
11. Create article/source record.
12. Chunk/embed/index.

## Parsing Requirements

- Preserve headings.
- Preserve page numbers for PDFs.
- Extract tables as structured text.
- Extract image captions/OCR.
- Preserve source file link.
- Store parser warnings.

## Failure Handling

- Password-protected file.
- Corrupt file.
- OCR failed.
- Unsupported file.
- Too large.
- Partial extraction.
- Duplicate detected.

## Acceptance Criteria

- User can upload document and ask questions after indexing.
- User sees indexing status.
- Failed ingestion shows actionable error.

