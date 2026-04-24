DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
DROP TRIGGER IF EXISTS trg_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS trg_articles_updated_at ON articles;
DROP TRIGGER IF EXISTS trg_articles_search_vector ON articles;
DROP FUNCTION IF EXISTS update_updated_at();
DROP FUNCTION IF EXISTS articles_search_vector_update();
DROP INDEX IF EXISTS idx_articles_search;
ALTER TABLE articles DROP COLUMN IF EXISTS search_vector;
