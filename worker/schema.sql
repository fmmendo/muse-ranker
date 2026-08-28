-- Apply with:
--   npx wrangler d1 execute preference-ranker --remote --file worker/schema.sql -c worker/wrangler.toml
-- (drop --remote to seed the local dev DB instead)

CREATE TABLE IF NOT EXISTS comparisons (
  id            TEXT PRIMARY KEY,   -- client uuid → idempotent upserts
  collection_id TEXT NOT NULL,      -- e.g. 'col:muse'
  user_id       TEXT NOT NULL,      -- anonymous GUID
  item_a_id     TEXT NOT NULL,
  item_b_id     TEXT NOT NULL,
  winner_id     TEXT NOT NULL,
  created_at    INTEGER NOT NULL,   -- client epoch ms
  received_at   INTEGER NOT NULL    -- server epoch ms
);

CREATE INDEX IF NOT EXISTS idx_cmp_collection ON comparisons(collection_id);
CREATE INDEX IF NOT EXISTS idx_cmp_user ON comparisons(collection_id, user_id);

CREATE TABLE IF NOT EXISTS users (
  user_id       TEXT NOT NULL,
  collection_id TEXT NOT NULL,
  first_seen    INTEGER NOT NULL,
  last_seen     INTEGER NOT NULL,
  PRIMARY KEY (user_id, collection_id)
);
