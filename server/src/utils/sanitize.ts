import sanitizeHtml from 'sanitize-html';

export function sanitize(raw: unknown): string {
  if (typeof raw !== 'string') return '';

  const htmlRemoved = sanitizeHtml(raw, {
    allowedTags: [], // no tags allowed
    allowedAttributes: {}, // no attributes allowed
    disallowedTagsMode: 'discard', // or 'completelyDiscard'
    parser: {
      // If set to true, entities within the document will be decoded. Defaults to true.
      // It is recommended to never disable the 'decodeEntities' option
      decodeEntities: true,
      lowerCaseTags: true,
    },
  });

  // src: https://github.com/facebook/react/blob/v18.2.0/packages/react-dom/src/shared/sanitizeURL.js#L22
  // const isJavaScriptProtocol =
  //  /^[\u0000-\u001F ]*j[\r\n\t]*a[\r\n\t]*v[\r\n\t]*a[\r\n\t]*s[\r\n\t]*c[\r\n\t]*r[\r\n\t]*i[\r\n\t]*p[\r\n\t]*t[\r\n\t]*\:/i;

  // HACK: Pseudo protocol handled in the front-end
  // return htmlRemoved.replace(/\]\(\s*javascript:[^)]+\)/gi, '](');
  return htmlRemoved;
}
