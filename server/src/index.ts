import { Hono } from 'hono';
import middleware from './middleware';
import comments from './comment';
import rss from './rss';
import admin from './admin';
import pow from './pow';

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
