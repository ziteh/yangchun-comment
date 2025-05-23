import { validator } from "hono/validator";
import { customAlphabet } from "nanoid";
import xss from "xss";

export default class Utils {
  static sanitize(raw: string) {
    return xss(raw, {
      whiteList: {}, // empty, means filter out all HTML tags
      stripIgnoreTag: true, // filter out all HTML not in the whitelist
      stripIgnoreTagBody: ["script"], // the script tag is a special case, we need to filter out its content
    }).replace(/\]\(\s*javascript:[^)]+\)/gi, "]("); // need it ? for `[XSS](javascript:alert('xss'))`
  }

  static genId() {
    // 100 IDs per Hour: ~352 years or 308M IDs needed, in order to have a 1% probability of at least one collision.
    // https://zelark.github.io/nano-id-cc/
    return customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 12)();
  }

  static getCommentKey(path: string) {
    return `comments:${path}`;
  }

  static validateQueryPath = validator("query", (value, c) => {
    const path = value["path"];
    if (!path || typeof path !== "string") {
      return c.text("Invalid path", 400); // 400 Bad Request
    }

    return {
      path,
    };
  });
}
