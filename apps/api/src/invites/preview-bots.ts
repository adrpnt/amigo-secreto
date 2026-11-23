// Robôs que montam o preview de um link colado numa conversa.
const PREVIEW_BOT_PATTERN =
  /whatsapp|facebookexternalhit|facebot|telegrambot|slackbot|twitterbot|discordbot|linkedinbot/i;

export function isPreviewBot(userAgent: string | undefined): boolean {
  return userAgent !== undefined && PREVIEW_BOT_PATTERN.test(userAgent);
}
