-- Cache field for content extracted from external article URLs (Jina AI Reader
-- or Mozilla Readability fallback). Populated lazily on first summarize when
-- rss_items.content is null or too short.

alter table rss_items
  add column if not exists extracted_content text,
  add column if not exists extracted_at timestamptz;

create index if not exists rss_items_extracted_at_idx
  on rss_items (extracted_at)
  where extracted_at is not null;
