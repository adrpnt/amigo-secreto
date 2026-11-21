import { isInAppBrowser } from './in-app-browser';

const WHATSAPP_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.82 Mobile Safari/537.36 WhatsApp/2.24.9.78';
const WHATSAPP_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/24.8.78';
const INSTAGRAM =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 329.0.3.29.120 (iPhone15,2; iOS 17_4; pt_BR; pt; scale=3.00; 1179x2556; 595323541)';
const FACEBOOK_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/462.0.0.38.107;FBBV/593553186;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBSS/3;FBID/phone;FBLC/pt_BR;FBOP/5]';
const FACEBOOK_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A.240405.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.82 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/462.0.0.47.86;]';
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36';
const SAFARI_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';

describe('isInAppBrowser', () => {
  it('reconhece o navegador do WhatsApp', () => {
    expect(isInAppBrowser(WHATSAPP_ANDROID)).toBe(true);
    expect(isInAppBrowser(WHATSAPP_IOS)).toBe(true);
  });

  it('reconhece o navegador do Instagram', () => {
    expect(isInAppBrowser(INSTAGRAM)).toBe(true);
  });

  it('reconhece o navegador do Facebook pelo FBAN e pelo FBAV', () => {
    expect(isInAppBrowser(FACEBOOK_IOS)).toBe(true);
    expect(isInAppBrowser(FACEBOOK_ANDROID)).toBe(true);
  });

  it('não reconhece o Chrome nem o Safari do celular', () => {
    expect(isInAppBrowser(CHROME_ANDROID)).toBe(false);
    expect(isInAppBrowser(SAFARI_IOS)).toBe(false);
  });
});
