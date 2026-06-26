import postgres from "postgres";

const url = process.env.DATABASE_URL ?? process.env.DB;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const sql = postgres(url, { max: 1 });

async function main() {
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;

  await sql`
    CREATE TABLE IF NOT EXISTS kb_article_chunks (
      id serial PRIMARY KEY,
      org_id text NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
      article_id integer NOT NULL REFERENCES kb_articles(id) ON DELETE CASCADE,
      attachment_id integer REFERENCES kb_article_attachments(id) ON DELETE CASCADE,
      source text NOT NULL,
      chunk_index integer NOT NULL,
      content text NOT NULL,
      tokens integer,
      embedding vector(1536) NOT NULL,
      embedding_model text NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_kb_chunks_article ON kb_article_chunks (article_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_kb_chunks_org_article ON kb_article_chunks (org_id, article_id)`;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_kb_chunks_embedding
    ON kb_article_chunks USING hnsw (embedding vector_cosine_ops)
  `;

  const [{ count }] = await sql<{ count: string }[]>`
    SELECT count(*)::text AS count FROM kb_article_chunks
  `;
  console.log(`kb_article_chunks ready (rows: ${count})`);
}

main()
  .then(() => sql.end())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err);
    await sql.end();
    process.exit(1);
  });
