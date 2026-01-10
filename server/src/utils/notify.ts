/**
 * Send notifications to Discord webhook
 */

export type NotificationType = 'comment-created' | 'comment-updated' | 'comment-deleted';

export interface NotificationPayload {
  type: NotificationType;
  id: string;
  pseudonym?: string;
  msg: string;
  post: string;
  replyTo?: string;
  isAdmin?: boolean;
}

export async function sendDiscordNotification(
  webhookUrl: string | undefined,
  title: string,
  message: string,
): Promise<void> {
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        embeds: [
          {
            title,
            description: message,
            color: 5814783,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error(
        `Discord webhook failed with status ${response.status}:`,
        await response.text(),
      );
    }
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
  }
}
