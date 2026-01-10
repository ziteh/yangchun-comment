import type { Comment } from '@ziteh/yangchun-comment-shared';

interface DbComment {
  id: string;
  post: string;
  pseudonym: string | null;
  msg: string;
  pub_date: number;
  mod_date: number | null;
  reply_to: string | null;
  is_admin: number;
}

export function dbCommentToComment(dbComment: DbComment): Comment {
  return {
    id: dbComment.id,
    pseudonym: dbComment.pseudonym || undefined,
    msg: dbComment.msg,
    pubDate: dbComment.pub_date,
    modDate: dbComment.mod_date || undefined,
    replyTo: dbComment.reply_to || undefined,
    isAdmin: dbComment.is_admin === 1 ? true : undefined,
  };
}

export async function getCommentsByPost(db: D1Database, post: string): Promise<Comment[]> {
  await ensureSchema(db);
  const stmt = db.prepare('SELECT * FROM comments WHERE post = ? ORDER BY pub_date ASC').bind(post);
  const res = await stmt.all<DbComment>();
  if (!res.success) {
    console.error('Failed to fetch comments:', res.error);
    return [];
  }

  return (res.results || []).map(dbCommentToComment);
}

export async function createComment(
  db: D1Database,
  post: string,
  comment: Comment,
): Promise<boolean> {
  await ensureSchema(db);
  const stmt = db
    .prepare(
      `INSERT INTO comments (id, post, pseudonym, msg, pub_date, mod_date, reply_to, is_admin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      comment.id,
      post,
      comment.pseudonym || null,
      comment.msg,
      comment.pubDate,
      comment.modDate || null,
      comment.replyTo || null,
      comment.isAdmin ? 1 : 0,
    );

  const res = await stmt.run();
  return res.success;
}

export async function updateComment(
  db: D1Database,
  id: string,
  msg: string,
  modDate: number,
): Promise<boolean> {
  await ensureSchema(db);
  const stmt = db
    .prepare('UPDATE comments SET msg = ?, mod_date = ? WHERE id = ?')
    .bind(msg, modDate, id);

  const res = await stmt.run();
  return res.success && res.meta.changes > 0;
}

export async function deleteComment(
  db: D1Database,
  id: string,
  deletedMarker: string,
  modDate: number,
): Promise<boolean> {
  await ensureSchema(db);
  const stmt = db
    .prepare('UPDATE comments SET pseudonym = ?, msg = ?, mod_date = ? WHERE id = ?')
    .bind(deletedMarker, deletedMarker, modDate, id); // Mark as deleted
  const res = await stmt.run();

  return res.success && res.meta.changes > 0;
}

export async function getCommentById(db: D1Database, id: string): Promise<Comment | null> {
  await ensureSchema(db);
  const stmt = db.prepare('SELECT * FROM comments WHERE id = ?').bind(id);
  const res = await stmt.first<DbComment>();

  return res ? dbCommentToComment(res) : null;
}

export async function getAllComments(
  db: D1Database,
  limit?: number,
): Promise<(Comment & { post: string })[]> {
  const sql = limit
    ? 'SELECT * FROM comments ORDER BY pub_date DESC LIMIT ?'
    : 'SELECT * FROM comments ORDER BY pub_date DESC';

  await ensureSchema(db);
  const stmt = limit ? db.prepare(sql).bind(limit) : db.prepare(sql);
  const res = await stmt.all<DbComment>();

  if (!res.success) {
    console.error('Failed to fetch all comments:', res.error);
    return [];
  }

  return (res.results || []).map((dbComment) => ({
    ...dbCommentToComment(dbComment),
    post: dbComment.post,
  }));
}

export async function hasComments(db: D1Database, post: string): Promise<boolean> {
  await ensureSchema(db);
  const stmt = db.prepare('SELECT COUNT(*) as count FROM comments WHERE post = ?').bind(post);
  const res = await stmt.first<{ count: number }>();

  return res ? res.count > 0 : false;
}

export async function getLoginFailCount(db: D1Database, ipHash: string): Promise<number> {
  await ensureSchema(db);
  const now = Date.now();
  const stmt = db
    .prepare('SELECT fail_count FROM login_fail_count WHERE ip_hash = ? AND expires_at > ?')
    .bind(ipHash, now);
  const res = await stmt.first<{ fail_count: number }>();
  return res?.fail_count ?? 0;
}

export async function incrementLoginFailCount(
  db: D1Database,
  ipHash: string,
  expirationSec: number,
): Promise<number> {
  await ensureSchema(db);
  const now = Date.now();
  const expiresAt = now + expirationSec * 1000;

  // Clean up expired records first
  await db.prepare('DELETE FROM login_fail_count WHERE expires_at <= ?').bind(now).run();

  const newCount = (await getLoginFailCount(db, ipHash)) + 1;

  // Upsert the fail count
  const stmt = db
    .prepare(
      `INSERT INTO login_fail_count (ip_hash, fail_count, created_at, expires_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(ip_hash) DO UPDATE SET
       fail_count = excluded.fail_count,
       expires_at = excluded.expires_at`,
    )
    .bind(ipHash, newCount, now, expiresAt);

  const res = await stmt.run();
  return res.success ? newCount : 0;
}

export async function clearLoginFailCount(db: D1Database, ipHash: string): Promise<void> {
  await ensureSchema(db);
  await db.prepare('DELETE FROM login_fail_count WHERE ip_hash = ?').bind(ipHash).run();
}

let isSchemaEnsured = false;
async function ensureSchema(db: D1Database) {
  if (isSchemaEnsured) return;

  const schemaSql = `CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post TEXT NOT NULL,
    pseudonym TEXT,
    msg TEXT NOT NULL,
    pub_date INTEGER NOT NULL,
    mod_date INTEGER,
    reply_to TEXT,
    is_admin INTEGER DEFAULT 0
  );

  CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post);
  CREATE INDEX IF NOT EXISTS idx_comments_pub_date ON comments(pub_date DESC);
  CREATE INDEX IF NOT EXISTS idx_comments_reply_to ON comments(reply_to);

  CREATE TABLE IF NOT EXISTS login_fail_count (
    ip_hash TEXT PRIMARY KEY,
    fail_count INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );
  `;

  try {
    await db.prepare(schemaSql).run();
    isSchemaEnsured = true;
  } catch (err) {
    console.error('Failed to ensure D1 schema:', err);
  }
}
