-- Initial schema for yangchun-comment D1 database

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post TEXT NOT NULL,
  pseudonym TEXT,
  msg TEXT NOT NULL,
  pub_date INTEGER NOT NULL,
  mod_date INTEGER,
  reply_to TEXT,
  is_admin INTEGER DEFAULT 0,
  FOREIGN KEY (reply_to) REFERENCES comments(id) ON DELETE SET NULL
);

-- Index for fast lookup by post
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post);

-- Index for fast lookup by pub_date (for RSS feeds)
CREATE INDEX IF NOT EXISTS idx_comments_pub_date ON comments(pub_date DESC);

-- Index for reply_to lookups
CREATE INDEX IF NOT EXISTS idx_comments_reply_to ON comments(reply_to);
