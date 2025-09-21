import { http, HttpResponse } from 'msw';
import type { Comment } from '@yangchun-comment/shared';

const msOfOneDay = 24 * 60 * 60 * 1000;
const tokenPrefix = 'mock-token-';

const getCommentId = (index: number) => `comment-${index}`;

const mockComments: Comment[] = [
  {
    id: getCommentId(1),
    pseudonym: 'Merry Palm',
    nameHash: '111111111111',
    pubDate: Date.now() - 3 * msOfOneDay,
    isAdmin: false,
    msg: `[Markdown](https://www.markdownguide.org/basic-syntax/#overview) is supported!

You can use \`**bold**\` for **bold**, \`*italic*\` for *italic*, and other formatting options.`,
  },
  {
    id: getCommentId(2),
    replyTo: getCommentId(1),
    pseudonym: 'Resourceful Wood',
    nameHash: '222222222222',
    pubDate: Date.now() - 1 * msOfOneDay,
    isAdmin: false,
    msg: 'I would like to reply to the above comment. ![SideraKB ErgoSNM](https://imgur.com/hzSMu2A.jpg)',
  },
  {
    id: getCommentId(3),
    pseudonym: '',
    nameHash: '',
    pubDate: Date.now() - 1 * msOfOneDay,
    isAdmin: false,
    msg: 'You may leave anonymous comments.',
  },
  {
    id: getCommentId(4),
    pseudonym: 'ZiTe',
    nameHash: '000000000000',
    pubDate: Date.now() - 1 * msOfOneDay,
    isAdmin: true,
    msg: 'Thank you all for your use and feedback!',
  },
];

const commentStorage: Comment[] = [...mockComments];
let nextId = mockComments.length + 1;

export const handlers = [
  http.get('*/api/comments', ({ request }) => {
    const url = new URL(request.url);
    const post = url.searchParams.get('post');

    console.debug('MSW: GET', post);

    return HttpResponse.json(commentStorage);
  }),

  http.post('*/api/comments', async ({ request }) => {
    const url = new URL(request.url);
    const post = url.searchParams.get('post');

    try {
      const body = (await request.json()) as {
        pseudonym: string;
        nameHash: string;
        msg: string;
        replyTo?: string;
        website?: string; // honeypot field
      };

      console.debug('MSW: POST', post, body);

      if (body.website && body.website.trim() !== '') {
        return HttpResponse.json({ error: 'Spam detected' }, { status: 400 });
      }

      const newComment: Comment = {
        id: getCommentId(nextId++),
        pseudonym: body.pseudonym,
        nameHash: body.nameHash,
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
      const body = (await request.json()) as {
        id: string;
        timestamp: number;
        token: string;
        pseudonym: string;
        nameHash: string;
        msg: string;
      };

      console.debug('MSW: PUT:', body);

      if (!body.token.startsWith(tokenPrefix)) {
        return HttpResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      const commentIndex = commentStorage.findIndex((c) => c.id === body.id);
      if (commentIndex === -1) {
        return HttpResponse.json({ error: 'Comment not found' }, { status: 404 });
      }

      commentStorage[commentIndex] = {
        ...commentStorage[commentIndex],
        pseudonym: body.pseudonym,
        nameHash: body.nameHash,
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
      const body = (await request.json()) as {
        id: string;
        timestamp: number;
        token: string;
      };

      console.debug('MSW: DELETE:', body);

      if (!body.token.startsWith(tokenPrefix)) {
        return HttpResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      const commentIndex = commentStorage.findIndex((c) => c.id === body.id);
      if (commentIndex === -1) {
        return HttpResponse.json({ error: 'Comment not found' }, { status: 404 });
      }

      commentStorage[commentIndex] = {
        ...commentStorage[commentIndex],
        pseudonym: 'deleted',
        nameHash: undefined,
        msg: 'deleted',
        modDate: Date.now(),
      };

      return HttpResponse.json({ success: true });
    } catch (error) {
      console.error('MSW: Error:', error);
      return HttpResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
  }),
];
