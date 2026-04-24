-- Categories
CREATE TABLE categories (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    slug        TEXT NOT NULL UNIQUE,
    color       TEXT NOT NULL DEFAULT '#57534E',
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users (admin only)
CREATE TABLE users (
    id             TEXT PRIMARY KEY,
    email          TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    name           TEXT NOT NULL,
    role           TEXT NOT NULL DEFAULT 'ADMIN',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Articles
CREATE TABLE articles (
    id                 TEXT PRIMARY KEY,
    title              TEXT NOT NULL,
    slug               TEXT NOT NULL UNIQUE,
    description        TEXT NOT NULL DEFAULT '',
    author_name        TEXT NOT NULL DEFAULT 'Nguyễn Văn Dương',
    content_html       TEXT NOT NULL DEFAULT '',
    content_plain      TEXT NOT NULL DEFAULT '',
    status             TEXT NOT NULL DEFAULT 'DRAFT',
    published_at       TIMESTAMPTZ,
    province           TEXT,
    district           TEXT,
    ward               TEXT,
    asset_type         TEXT,
    plot_count         INT,
    total_area         TEXT,
    thumbnail_key      TEXT,
    original_file_key  TEXT,
    original_file_name TEXT,
    original_file_mime TEXT,
    legacy_id          INT UNIQUE,
    legacy_file_key    TEXT,
    view_count         INT NOT NULL DEFAULT 0,
    category_id        TEXT REFERENCES categories(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_category ON articles(category_id);
CREATE INDEX idx_articles_published ON articles(published_at DESC);
CREATE INDEX idx_articles_province ON articles(province);
CREATE INDEX idx_articles_slug ON articles(slug);

-- Article images (gallery)
CREATE TABLE article_images (
    id          TEXT PRIMARY KEY,
    article_id  TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    file_key    TEXT NOT NULL,
    file_name   TEXT NOT NULL DEFAULT '',
    alt_text    TEXT NOT NULL DEFAULT '',
    width       INT NOT NULL DEFAULT 0,
    height      INT NOT NULL DEFAULT 0,
    size_bytes  INT NOT NULL DEFAULT 0,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_article_images_article ON article_images(article_id);

-- Article attachments
CREATE TABLE article_attachments (
    id          TEXT PRIMARY KEY,
    article_id  TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    file_key    TEXT NOT NULL,
    file_name   TEXT NOT NULL DEFAULT '',
    file_mime   TEXT NOT NULL DEFAULT '',
    size_bytes  INT NOT NULL DEFAULT 0,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_article_attachments_article ON article_attachments(article_id);

-- Tags
CREATE TABLE tags (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    slug        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Article-Tag join table
CREATE TABLE article_tags (
    article_id  TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX idx_article_tags_tag ON article_tags(tag_id);

-- View events (analytics)
CREATE TABLE view_events (
    id          TEXT PRIMARY KEY,
    article_id  TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    viewed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_hash     TEXT NOT NULL DEFAULT '',
    user_agent  TEXT,
    referrer    TEXT
);

CREATE INDEX idx_view_events_article_time ON view_events(article_id, viewed_at);
