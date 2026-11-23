import { isPreviewBot } from './preview-bots.js';

describe('robôs de preview', () => {
  it('reconhece WhatsApp, facebookexternalhit, Facebot, TelegramBot, Slackbot, Twitterbot, Discordbot e LinkedInBot', () => {
    const bots = [
      'WhatsApp/2.23.20.0 A',
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
      'Facebot',
      'TelegramBot (like TwitterBot)',
      'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
      'Twitterbot/1.0',
      'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)',
      'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
    ];
    for (const userAgent of bots) {
      expect(isPreviewBot(userAgent)).toBe(true);
    }
  });

  it('não reconhece navegadores comuns nem User-Agent ausente', () => {
    const browsers = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.7; rv:132.0) Gecko/20100101 Firefox/132.0',
      'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
    ];
    for (const userAgent of browsers) {
      expect(isPreviewBot(userAgent)).toBe(false);
    }
    expect(isPreviewBot(undefined)).toBe(false);
    expect(isPreviewBot('')).toBe(false);
  });
});
