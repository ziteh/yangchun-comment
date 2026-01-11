import { http, HttpResponse } from 'msw';
import type { Comment } from '@ziteh/yangchun-comment-shared';

const msOfOneDay = 24 * 60 * 60 * 1000;
const tokenPrefix = 'mock-token-';

const getCommentId = (index: number) => `comment-${index}`;

const mockComments: Comment[] = [
  {
    id: getCommentId(1),
    pseudonym: 'Merry Palm',
    pubDate: Date.now() - 3 * msOfOneDay,
    isAdmin: false,
    msg: `[Markdown](https://www.markdownguide.org/basic-syntax/#overview) is supported!

You can use \`**bold**\` for **bold**, \`*italic*\` for *italic*, and other formatting options.`,
  },
  {
    id: getCommentId(2),
    replyTo: getCommentId(1),
    pseudonym: 'Resourceful Wood',
    pubDate: Date.now() - 1 * msOfOneDay,
    isAdmin: false,
    msg: 'I would like to reply to the above comment. ![SideraKB ErgoSNM](https://imgur.com/hzSMu2A.jpg)',
  },
  {
    id: getCommentId(3),
    pseudonym: '',
    pubDate: Date.now() - 1 * msOfOneDay,
    isAdmin: false,
    msg: 'You may leave anonymous comments.',
  },
  {
    id: getCommentId(4),
    pseudonym: 'ZiTe',
    pubDate: Date.now() - 14 * msOfOneDay,
    isAdmin: true,
    msg: 'Thank you all for your use and feedback!',
  },
];

const commentStorage: Comment[] = [...mockComments];
let nextId = mockComments.length + 1;
let isAdminAuthenticated = false;

export const handlers = [
  http.get('*/api/pow/formal-challenge', ({ request }) => {
    const url = new URL(request.url);
    const challenge = url.searchParams.get('challenge');
    const nonce = url.searchParams.get('nonce');

    console.debug('MSW: GET /api/pow/formal-challenge', { challenge, nonce });

    // Simple mock: just return a formal challenge based on the pre-challenge
    const timestamp = Math.floor(Date.now() / 1000);
    const difficulty = 2; // Mock difficulty
    const formalChallenge = `${timestamp}:${challenge}:${difficulty}`;

    return HttpResponse.json({
      challenge: formalChallenge,
    });
  }),

  http.get('*/api/comments', ({ request }) => {
    const url = new URL(request.url);
    const post = url.searchParams.get('post');

    console.debug('MSW: GET', post);

    return HttpResponse.json({
      comments: commentStorage,
      isAdmin: false,
    });
  }),

  http.post('*/api/comments', async ({ request }) => {
    const url = new URL(request.url);
    const post = url.searchParams.get('post');

    try {
      const body = (await request.json()) as {
        pseudonym?: string;
        msg: string;
        replyTo?: string;
        email?: string; // honeypot field
      };

      console.debug('MSW: POST', post, body);

      if (body.email && body.email.trim() !== '') {
        return HttpResponse.json({ error: 'Spam detected' }, { status: 400 });
      }

      const newComment: Comment = {
        id: getCommentId(nextId++),
        pseudonym: body.pseudonym,
        msg: body.msg,
        pubDate: Date.now(),
        replyTo: body.replyTo || undefined,
        isAdmin: false,
      };

      commentStorage.push(newComment);

      return HttpResponse.json({
        id: newComment.id,
        timestamp: newComment.pubDate,
        token: `${tokenPrefix}${newComment.id}`,
      });
    } catch (error) {
      console.error('MSW: Error:', error);
      return HttpResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
  }),

  http.put('*/api/comments', async ({ request }) => {
    try {
      const id = request.headers.get('x-comment-id') || request.headers.get('X-Comment-ID');
      const token =
        request.headers.get('x-comment-token') || request.headers.get('X-Comment-Token') || '';
      const tsHeader =
        request.headers.get('x-comment-timestamp') || request.headers.get('X-Comment-Timestamp');
      const timestamp = tsHeader ? parseInt(tsHeader, 10) : NaN;

      const body = (await request.json()) as {
        pseudonym?: string;
        msg: string;
      };

      console.debug('MSW: PUT:', { id, token, timestamp, body });

      if (!token || !token.startsWith(tokenPrefix)) {
        return HttpResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      if (!id) {
        return HttpResponse.json({ error: 'Missing comment id' }, { status: 400 });
      }

      const commentIndex = commentStorage.findIndex((c) => c.id === id);
      if (commentIndex === -1) {
        return HttpResponse.json({ error: 'Comment not found' }, { status: 404 });
      }

      commentStorage[commentIndex] = {
        ...commentStorage[commentIndex],
        pseudonym: body.pseudonym,
        msg: body.msg,
        modDate: Date.now(),
      };

      return HttpResponse.json({ success: true });
    } catch (error) {
      console.error('MSW: Error:', error);
      return HttpResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
  }),

  http.delete('*/api/comments', async ({ request }) => {
    try {
      const id = request.headers.get('x-comment-id') || request.headers.get('X-Comment-ID');
      const token =
        request.headers.get('x-comment-token') || request.headers.get('X-Comment-Token') || '';

      console.debug('MSW: DELETE:', { id, token });

      if (!token || !token.startsWith(tokenPrefix)) {
        return HttpResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      if (!id) {
        return HttpResponse.json({ error: 'Missing comment id' }, { status: 400 });
      }

      const commentIndex = commentStorage.findIndex((c) => c.id === id);
      if (commentIndex === -1) {
        return HttpResponse.json({ error: 'Comment not found' }, { status: 404 });
      }

      commentStorage[commentIndex] = {
        ...commentStorage[commentIndex],
        pseudonym: 'deleted',
        msg: 'deleted',
        modDate: Date.now(),
      };

      return HttpResponse.json({ success: true });
    } catch (error) {
      console.error('MSW: Error:', error);
      return HttpResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
  }),

  // Admin endpoints
  http.post('*/admin/login', async ({ request }) => {
    try {
      const body = (await request.json()) as {
        username: string;
        password: string;
      };

      console.debug('MSW: POST /admin/login', { username: body.username });

      // Simple mock: accept any username "admin" with any password
      if (body.username === 'admin') {
        isAdminAuthenticated = true;
        return HttpResponse.json({
          success: true,
          message: 'Login successful',
        });
      }

      return HttpResponse.json(
        {
          success: false,
          message: 'Invalid credentials',
        },
        { status: 401 },
      );
    } catch (error) {
      console.error('MSW: Error:', error);
      return HttpResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
  }),

  http.post('*/admin/logout', () => {
    console.debug('MSW: POST /admin/logout');
    isAdminAuthenticated = false;
    return HttpResponse.json({
      success: true,
      message: 'Logout successful',
    });
  }),

  http.get('*/admin/check', () => {
    console.debug('MSW: GET /admin/check', { authenticated: isAdminAuthenticated });
    return HttpResponse.json({
      authenticated: isAdminAuthenticated,
    });
  }),
];
