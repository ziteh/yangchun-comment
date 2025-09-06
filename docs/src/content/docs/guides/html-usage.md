---
title: HTML Usage Example
description: How to use Yangchun Comment in plain HTML
---

# HTML Usage Example

Here's how to use Yangchun Comment in a plain HTML page:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Yangchun Comment Example</title>
    <!-- Include the component styles -->
    <link rel="stylesheet" href="node_modules/@yangchun-comment/client/dist/yangchun-comment.css" />
  </head>
  <body>
    <h1>My Blog Post</h1>
    <p>This is the content of my blog post...</p>

    <!-- Include the Yangchun Comment component -->
    <yangchun-comment post="/blog/my-post" api-url="https://your-api-server.com/" language="en">
    </yangchun-comment>

    <!-- Include the JavaScript -->
    <script
      type="module"
      src="node_modules/@yangchun-comment/client/dist/yangchun-comment.es.js"
    ></script>
  </body>
</html>
```

## With CDN (Future)

Once published to npm, you could also use it via CDN:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Yangchun Comment Example</title>
    <!-- Include from CDN -->
    <link
      rel="stylesheet"
      href="https://unpkg.com/@yangchun-comment/client/dist/yangchun-comment.css"
    />
  </head>
  <body>
    <h1>My Blog Post</h1>
    <p>This is the content of my blog post...</p>

    <!-- Include the Yangchun Comment component -->
    <yangchun-comment post="/blog/my-post" api-url="https://your-api-server.com/" language="en">
    </yangchun-comment>

    <!-- Include the JavaScript from CDN -->
    <script
      type="module"
      src="https://unpkg.com/@yangchun-comment/client/dist/yangchun-comment.es.js"
    ></script>
  </body>
</html>
```

## React Integration

For React applications:

```tsx
import { useEffect } from 'react';

// Import the component (this registers the custom element)
import '@yangchun-comment/client';
import '@yangchun-comment/client/style.css';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'yangchun-comment': {
        post?: string;
        'api-url'?: string;
        language?: 'en' | 'zh-Hant';
        'author-name'?: string;
      };
    }
  }
}

function BlogPost() {
  return (
    <div>
      <h1>My Blog Post</h1>
      <p>Content goes here...</p>

      <yangchun-comment post="/blog/my-post" api-url="https://your-api-server.com/" language="en" />
    </div>
  );
}

export default BlogPost;
```

## Vue Integration

For Vue applications:

```vue
<template>
  <div>
    <h1>My Blog Post</h1>
    <p>Content goes here...</p>

    <yangchun-comment
      :post="'/blog/my-post'"
      :api-url="'https://your-api-server.com/'"
      :language="'en'"
    />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';

onMounted(() => {
  // Import the component (this registers the custom element)
  import('@yangchun-comment/client');
  import('@yangchun-comment/client/style.css');
});
</script>
```
