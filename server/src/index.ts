import { Hono } from 'hono';
import middleware from './routes/middleware';
import comments from './routes/comment';
import rss from './routes/rss';
import admin from './routes/admin';
import pow from './routes/pow';

const app = new Hono();

// Error handling
app.onError((err, c) => {
  console.error(`${c.req.method} ${c.req.path} - Error:`, err);
  return c.text('Internal Server Error', 500); // 500 Internal Server Error
});

app.route('/', middleware);
app.route('/api/pow', pow);
app.route('/api/comments', comments);
app.route('/rss', rss);
app.route('/admin', admin);

export default app;
