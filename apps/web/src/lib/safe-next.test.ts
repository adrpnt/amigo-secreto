import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('aceita um caminho do próprio site com query', () => {
    expect(safeNext('/convite/abc?origem=whatsapp')).toBe(
      '/convite/abc?origem=whatsapp',
    );
  });

  it('troca por /perfil um caminho que começa com //', () => {
    expect(safeNext('//evil.example/roubo')).toBe('/perfil');
  });

  it('troca por /perfil um caminho que começa com /\\', () => {
    expect(safeNext('/\\evil.example/roubo')).toBe('/perfil');
  });

  it('troca por /perfil um endereço com esquema', () => {
    expect(safeNext('https://evil.example/perfil')).toBe('/perfil');
    expect(safeNext('javascript:alert(1)')).toBe('/perfil');
  });

  it('troca por /perfil os caminhos /entrar e /cadastro', () => {
    expect(safeNext('/entrar')).toBe('/perfil');
    expect(safeNext('/cadastro?next=/grupos')).toBe('/perfil');
  });

  it('troca por /perfil um valor ausente', () => {
    expect(safeNext(null)).toBe('/perfil');
    expect(safeNext(undefined)).toBe('/perfil');
    expect(safeNext('')).toBe('/perfil');
  });
});
