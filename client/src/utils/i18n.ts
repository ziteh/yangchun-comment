export interface I18nStrings {
  // https://developer.mozilla.org/en-US/docs/Glossary/BCP_47_language_tag
  bcp47: string;

  anonymous: string;
  submit: string;
  preview: string;
  edit: string;
  edited: string;
  editing: string;
  delete: string;
  reply: string;
  replyTo: string;
  replyingTo: string;
  notify: string;
  help: string;
  cancel: string;
  close: string;
  author: string;
  me: string;

  messagePlaceholder: string;
  nicknamePlaceholder: string;

  confirmDelete: string;
  confirmDeleteDesc1: string;
  confirmDeleteDesc2: string;

  helpDesc: string;
  helpMdLink: string;
  helpMdImage: string;
  helpMdItalic: string;
  helpMdBold: string;
  helpMdList: string;
  helpMdOrderedList: string;
  helpMdInlineCode: string;
  helpMdCodeBlock: string;
  helpMdNoHtml: string;

  notifyDesc: string;

  noComments: string;
  showMore: string;
  showLess: string;
}

export const enUS: I18nStrings = {
  bcp47: 'en-US',
  anonymous: 'Anonymous',
  submit: 'Submit',
  preview: 'Preview',
  edit: 'Edit',
  edited: 'Edited',
  editing: 'Editing: ',
  delete: 'Delete',
  reply: 'Reply',
  replyTo: 'Reply to',
  replyingTo: 'Replying to: ',
  notify: 'Notify',
  help: 'Help',
  cancel: 'Cancel',
  close: 'Close',
  author: 'Author',
  me: 'Me',
  messagePlaceholder: 'Write a comment...\nSupports Markdown',
  nicknamePlaceholder: 'Nickname (optional), it will be converted to a pseudonym',
  confirmDelete: 'Confirm delete',
  confirmDeleteDesc1: 'Are you sure you want to delete this comment? Comment ID: ',
  confirmDeleteDesc2: 'This action cannot be undone!',
  helpDesc: `This is a simple comment system — you can post comments and reply to others. You may preview your content before posting.
  You can fill in a nickname which will be converted to a pseudonym for privacy, or leave it blank to remain anonymous.
  After posting, you can edit or delete your own comment within two minutes without leaving or refreshing the page.
  Comment content supports basic Markdown and does not support HTML.`,
  helpMdLink: 'Link',
  helpMdImage: 'Image',
  helpMdItalic: 'Italic',
  helpMdBold: 'Bold',
  helpMdList: 'List item',
  helpMdOrderedList: 'Ordered list item',
  helpMdInlineCode: 'Inline code',
  helpMdCodeBlock: 'Code block',
  helpMdNoHtml: 'No HTML',
  notifyDesc: 'You can subscribe to the comments RSS feed for this post: ',
  noComments: 'No comments yet',
  showMore: 'Show more',
  showLess: 'Show less',
};

export const zhTW: I18nStrings = {
  bcp47: 'zh-TW',
  anonymous: '匿名',
  submit: '發送',
  preview: '預覽',
  edit: '編輯',
  edited: '已編輯',
  editing: '正在編輯：',
  delete: '刪除',
  reply: '回覆',
  replyTo: '回覆給',
  replyingTo: '正在回覆：',
  notify: '通知',
  cancel: '取消',
  close: '關閉',
  help: '幫助',
  author: '作者',
  me: '我',
  messagePlaceholder: '請輸入留言...\n支援 Markdown',
  nicknamePlaceholder: '暱稱（選填）將會被轉換為假名',
  confirmDelete: '確認刪除',
  confirmDeleteDesc1: '確定要刪除此留言嗎？留言 ID: ',
  confirmDeleteDesc2: '此操作無法復原！',
  helpDesc: `這是一個簡單的留言板，你可以發表留言、回覆他人的留言，發表前可以先預覽內容。
留言時可以填寫暱稱，系統會將其轉換為假名以保護你的隱私，或留空保持匿名。
發表留言後，在不離開或重新整理頁面的情況下，可以編輯或刪除自己兩分鐘內的留言。
留言內容支援基本 Markdown 語法，不支援 HTML。`,
  helpMdLink: '連結',
  helpMdImage: '圖片',
  helpMdItalic: '斜體',
  helpMdBold: '粗體',
  helpMdList: '清單項目',
  helpMdOrderedList: '有序清單項目',
  helpMdInlineCode: '行內程式碼',
  helpMdCodeBlock: '程式碼區塊',
  helpMdNoHtml: '不支援 HTML',
  notifyDesc: '你可以訂閱此文章的留言 RSS Feed：',
  noComments: '目前還沒有留言',
  showMore: '顯示全部',
  showLess: '折疊',
};

let currentLanguage: I18nStrings = enUS;

export function t(key: keyof I18nStrings): string {
  return currentLanguage[key] || key;
}

export function initI18n(lang: I18nStrings) {
  currentLanguage = lang;
}
