export type I18nStrings = {
  anonymous: string;
  replyTo: string;
  edit: string;
  delete: string;
  reply: string;
  replyingTo: string;
  cancelReply: string;
  editing: string;
  cancelEdit: string;
  updateComment: string;
  submitComment: string;
  namePlaceholder: string;
  messagePlaceholder: string;
  loading: string;
  confirmDelete: string;
  editFailed: string;
  submitFailed: string;
  deleteFailed: string;
  nameTooLong: string;
  messageTooLong: string;
  write: string;
  preview: string;
  emptyPreview: string;
  markdownHelp: string;
  modified: string;
  commentSystemTitle: string;
  commentSystemDesc: string;
  commentTimeLimit: string;
  markdownSyntax: string;
  markdownBasicSupport: string;
  markdownLinkExample: string;
  markdownImageExample: string;
  markdownItalicExample: string;
  markdownBoldExample: string;
  markdownListExample: string;
  markdownOrderedListExample: string;
  markdownInlineCodeExample: string;
  markdownCodeBlockExample: string;
  pseudonymNotice: string;
  editingPseudonymNotice: string;
};

export const en: I18nStrings = {
  anonymous: 'Anonymous',
  replyTo: 'Reply to',
  edit: 'Edit',
  delete: 'Delete',
  reply: 'Reply',
  replyingTo: 'Replying to: ',
  modified: 'Modified on',
  cancelReply: 'Cancel',
  editing: 'Editing: ',
  cancelEdit: 'Cancel',
  updateComment: 'Update',
  submitComment: 'Submit',
  namePlaceholder: 'Name (optional)',
  messagePlaceholder: 'Your comment...\nSupports Markdown syntax',
  loading: 'Loading...',
  confirmDelete: 'Are you sure you want to delete this comment?',
  editFailed: 'Failed to edit comment. Permission may have expired.',
  submitFailed: 'Failed to submit comment.',
  deleteFailed: 'Failed to delete comment. Permission may have expired.',
  nameTooLong: 'Name is too long',
  messageTooLong: 'Message is too long',
  write: 'Write',
  preview: 'Preview',
  emptyPreview: 'Nothing to preview',
  markdownHelp: 'Help',
  commentSystemTitle: 'Comments',
  commentSystemDesc:
    'This is a simple comment system. You can post your opinions or respond to other comments. Click "Preview" to see how your comment looks before posting.',
  commentTimeLimit:
    "After posting a comment, you can edit or delete it within two minutes, as long as you don't leave or refresh the page.",
  markdownSyntax: 'Syntax',
  markdownBasicSupport: 'Basic Markdown syntax is supported. HTML is not supported.',
  markdownLinkExample: '[Link](https://www.example.com)',
  markdownImageExample: '![Image](https://www.example.com/sample.jpg)',
  markdownItalicExample: '*Italic* or _Italic_',
  markdownBoldExample: '**Bold** or __Bold__',
  markdownListExample: '- List item',
  markdownOrderedListExample: '1. Ordered list item',
  markdownInlineCodeExample: '`Inline code`',
  markdownCodeBlockExample: '```\nCode block\n```',
  pseudonymNotice: 'Will be converted to a unique pseudonym, longer names help avoid impersonation',
  editingPseudonymNotice: 'Cannot be changed when editing',
};

export const zhHant: I18nStrings = {
  anonymous: '匿名',
  replyTo: '回覆給',
  edit: '編輯',
  delete: '刪除',
  reply: '回覆',
  modified: '修改於',
  replyingTo: '回覆給：',
  cancelReply: '取消',
  editing: '編輯中：',
  cancelEdit: '取消',
  updateComment: '更新',
  submitComment: '發送',
  namePlaceholder: '名稱 (選填)',
  messagePlaceholder: '留言內容...\n支援 Markdown 語法',
  loading: '載入中...',
  confirmDelete: '確定要刪除此留言嗎?',
  editFailed: '編輯留言失敗，可能權限已過期',
  submitFailed: '發送留言失敗',
  deleteFailed: '刪除留言失敗，可能權限已過期',
  nameTooLong: '暱稱過長',
  messageTooLong: '留言內容過長',
  write: '編輯',
  preview: '預覽',
  emptyPreview: '沒有內容可供預覽',
  markdownHelp: '說明',
  commentSystemTitle: '留言',
  commentSystemDesc:
    '這是一個簡單的留言系統，你可以發表意見或回應其他留言。發佈前可點擊「預覽」查看留言樣式。',
  commentTimeLimit: '發佈留言後，在不離開或重新整理頁面的情況下，你可以編輯或刪除兩分鐘內的留言。',
  markdownSyntax: '語法',
  markdownBasicSupport: '支援基本 Markdown 語法，不支援 HTML。',
  markdownLinkExample: '[連結](https://www.example.com)',
  markdownImageExample: '![圖片](https://www.example.com/sample.jpg)',
  markdownItalicExample: '*斜體* 或 _斜體_',
  markdownBoldExample: '**粗體** 或 __粗體__',
  markdownListExample: '- 清單',
  markdownOrderedListExample: '1. 編號清單',
  markdownInlineCodeExample: '`行內程式碼`',
  markdownCodeBlockExample: '```\n程式碼區塊\n```',
  pseudonymNotice: '名稱將被轉換為化名，使用較長的名稱有助於避免被冒充',
  editingPseudonymNotice: '編輯時無法更改',
};

export const createI18n = (initLang: I18nStrings = en) => {
  let currentStrings = initLang;

  return {
    t: (key: keyof I18nStrings): string => currentStrings[key],
    setLanguage: (lang: I18nStrings) => {
      currentStrings = lang;
    },
    getLanguage: () => currentStrings,
  };
};
