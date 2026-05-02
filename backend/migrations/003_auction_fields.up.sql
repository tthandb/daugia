-- Optional fields for SEO Event schema and hand-written meta descriptions.
-- All nullable so existing rows continue to render with the auto-clipped fallback.

ALTER TABLE articles
    ADD COLUMN meta_description TEXT,
    ADD COLUMN auction_start    TIMESTAMPTZ,
    ADD COLUMN auction_end      TIMESTAMPTZ,
    ADD COLUMN venue_name       TEXT,
    ADD COLUMN venue_address    TEXT,
    ADD COLUMN starting_price   BIGINT,   -- VND, integer (no decimals)
    ADD COLUMN deposit_amount   BIGINT;   -- VND
