/// <reference types="astro/client" />

declare namespace JSX {
  interface IntrinsicElements {
    'yangchun-comment': {
      post?: string;
      'api-url'?: string;
      language?: 'en' | 'zh-Hant';
      'author-name'?: string;
    };
    div: {
      id?: string;
      class?: string;
      children?: string | JSX.Element | JSX.Element[];
    };
    script: {
      children?: string;
      type?: string;
      src?: string;
    };
    style: {
      children?: string;
    };
  }
}
