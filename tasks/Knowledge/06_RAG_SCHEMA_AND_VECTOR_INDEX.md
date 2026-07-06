# RAG Schema And Vector Index

## knowledge_source_documents

Tracks uploaded or generated source documents.

Fields:

- id.
- org_id.
- space_id.
- article_id nullable.
- file_name.
- file_type.
- mime_type.
- file_url.
- file_size_bytes.
- checksum.
- source_kind.
- parse_status.
- indexing_status.
- language.
- page_count.
- uploaded_by.
- created_at.
- updated_at.
- deleted_at.

Source kinds:

- uploaded_file.
- article_content.
- imported_url.
- generated_pdf.
- support_article.

## knowledge_ingestion_jobs

Fields:

- id.
- org_id.
- source_document_id.
- status.
- step.
- error_message.
- parser_version.
- chunker_version.
- embedding_model.
- started_at.
- completed_at.
- created_at.

Statuses:

- queued.
- parsing.
- chunking.
- embedding.
- indexed.
- failed.
- cancelled.

## knowledge_chunks

Fields:

- id.
- org_id.
- source_document_id.
- article_id nullable.
- article_version_id nullable.
- chunk_index.
- chunk_text.
- chunk_hash.
- heading_path.
- page_number.
- section_title.
- token_count.
- metadata_json.
- acl_hash.
- visibility.
- trust_state.
- verified_until.
- created_at.
- updated_at.
- deleted_at.

## knowledge_embeddings

Fields:

- id.
- org_id.
- chunk_id.
- embedding_model.
- embedding_version.
- vector.
- vector_dimensions.
- created_at.

## knowledge_retrieval_logs

Fields:

- id.
- org_id.
- user_id.
- query.
- scope_json.
- retrieved_chunk_ids.
- reranked_chunk_ids.
- answer_id nullable.
- latency_ms.
- created_at.

## Key Rules

- Every chunk must carry org, source, version, permission, freshness, and trust metadata.
- Permission checks happen before answer generation.
- Embeddings must be deleted or disabled when source content is deleted, archived, or permission-restricted.

