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
  write: string;
  preview: string;
  emptyPreview: string;
};

export const en: I18nStrings = {
  anonymous: 'Anonymous',
  replyTo: 'Reply to',
  edit: 'Edit',
  delete: 'Delete',
  reply: 'Reply',
  replyingTo: 'Replying to: ',
  cancelReply: 'Cancel Reply',
  editing: 'Editing: ',
  cancelEdit: 'Cancel Edit',
  updateComment: 'Update Comment',
  submitComment: 'Submit Comment',
  namePlaceholder: 'Name (optional)',
  messagePlaceholder: 'Your comment...',
  loading: 'Loading...',
  confirmDelete: 'Are you sure you want to delete this comment?',
  editFailed: 'Failed to edit comment. Permission may have expired.',
  submitFailed: 'Failed to submit comment.',
  deleteFailed: 'Failed to delete comment. Permission may have expired.',
  write: 'Write',
  preview: 'Preview',
  emptyPreview: 'Nothing to preview',
};

export const zhHant: I18nStrings = {
  anonymous: '匿名',
  replyTo: '回覆給',
  edit: '編輯',
  delete: '刪除',
  reply: '回覆',
  replyingTo: '回覆給：',
  cancelReply: '取消回覆',
  editing: '編輯中：',
  cancelEdit: '取消編輯',
  updateComment: '更新留言',
  submitComment: '發送留言',
  namePlaceholder: '姓名 (選填)',
  messagePlaceholder: '留言內容...',
  loading: '載入中...',
  confirmDelete: '確定要刪除此留言嗎?',
  editFailed: '編輯留言失敗，可能權限已過期',
  submitFailed: '發送留言失敗',
  deleteFailed: '刪除留言失敗，可能權限已過期',
  write: '編輯',
  preview: '預覽',
  emptyPreview: '沒有內容可供預覽',
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
