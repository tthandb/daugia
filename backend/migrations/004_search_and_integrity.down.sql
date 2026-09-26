DROP INDEX IF EXISTS idx_articles_published_list;
CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_slug ON articles(slug);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_status_check;

DROP TRIGGER IF EXISTS trg_articles_updated_at ON articles;
CREATE TRIGGER trg_articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION articles_search_vector_update() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.content_plain, '')), 'C') ||
        setweight(to_tsvector('simple', COALESCE(NEW.author_name, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_articles_search_vector ON articles;
CREATE TRIGGER trg_articles_search_vector
    BEFORE INSERT OR UPDATE ON articles
    FOR EACH ROW
    EXECUTE FUNCTION articles_search_vector_update();

ALTER TABLE articles DISABLE TRIGGER trg_articles_updated_at;
UPDATE articles SET title = title;
ALTER TABLE articles ENABLE TRIGGER trg_articles_updated_at;

DROP TEXT SEARCH CONFIGURATION IF EXISTS vi;
