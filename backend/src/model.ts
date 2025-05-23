export type Comment = {
  // Unique ID
  id: string;

  // Author name
  name?: string;

  // Author email
  email?: string;

  // Content
  msg: string;

  // Publish date timestamp
  pubDate: number;
};
