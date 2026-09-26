-- Accent-insensitive Vietnamese search: "dau gia" must match "đấu giá".
CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE TEXT SEARCH CONFIGURATION vi (COPY = simple);
ALTER TEXT SEARCH CONFIGURATION vi
    ALTER MAPPING FOR hword, hword_part, word WITH unaccent, simple;

CREATE OR REPLACE FUNCTION articles_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('vi', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('vi', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('vi', COALESCE(NEW.content_plain, '')), 'C') ||
        setweight(to_tsvector('vi', COALESCE(NEW.author_name, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only recompute the vector when indexed text changes; a view-count bump must
-- not re-tokenise the whole document nor advance updated_at (sitemap lastmod).
DROP TRIGGER IF EXISTS trg_articles_search_vector ON articles;
CREATE TRIGGER trg_articles_search_vector
    BEFORE INSERT OR UPDATE OF title, description, content_plain, author_name ON articles
    FOR EACH ROW
    EXECUTE FUNCTION articles_search_vector_update();

DROP TRIGGER IF EXISTS trg_articles_updated_at ON articles;
CREATE TRIGGER trg_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    WHEN (OLD.view_count = NEW.view_count)
    EXECUTE FUNCTION update_updated_at();

ALTER TABLE articles DISABLE TRIGGER trg_articles_updated_at;
UPDATE articles SET
    search_vector =
        setweight(to_tsvector('vi', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('vi', COALESCE(description, '')), 'B') ||
        setweight(to_tsvector('vi', COALESCE(content_plain, '')), 'C') ||
        setweight(to_tsvector('vi', COALESCE(author_name, '')), 'D');
ALTER TABLE articles ENABLE TRIGGER trg_articles_updated_at;

ALTER TABLE articles
    ADD CONSTRAINT articles_status_check CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED'));
ALTER TABLE users
    ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN'));

DROP INDEX IF EXISTS idx_articles_slug;
DROP INDEX IF EXISTS idx_articles_status;
CREATE INDEX idx_articles_published_list
    ON articles (published_at DESC, id)
    WHERE status = 'PUBLISHED';
