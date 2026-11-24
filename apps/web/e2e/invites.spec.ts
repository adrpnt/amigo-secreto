import { expect, test } from './support/fixtures';

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

test.describe('convite', () => {
  test('a imagem do preview é um PNG de 1200 x 630', async ({ request }) => {
    const response = await request.get('/og/convite.png');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    const body = await response.body();
    expect(body.subarray(0, 8)).toEqual(PNG_SIGNATURE);
    // O cabeçalho IHDR guarda largura e altura nos bytes 16 a 23.
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
  });
});
