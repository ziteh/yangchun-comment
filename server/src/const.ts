export const CONSTANTS = {
  deletedMarker: 'deleted',
  commentsKeyPrefix: 'comments:',
};

// https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status
export const HTTP_STATUS = {
  Ok: 200,
  Created: 201,

  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  TooManyRequests: 429,

  InternalServerError: 500,
} as const;
