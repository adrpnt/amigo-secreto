import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('aceita um caminho do próprio site com query', () => {
    expect(safeNext('/convite/abc?origem=whatsapp')).toBe(
      '/convite/abc?origem=whatsapp',
    );
  });

  it('troca por /grupos um caminho que começa com //', () => {
    expect(safeNext('//evil.example/roubo')).toBe('/grupos');
  });

  it('troca por /grupos um caminho que começa com /\\', () => {
    expect(safeNext('/\\evil.example/roubo')).toBe('/grupos');
  });

  it('troca por /grupos um endereço com esquema', () => {
    expect(safeNext('https://evil.example/perfil')).toBe('/grupos');
    expect(safeNext('javascript:alert(1)')).toBe('/grupos');
  });

  it('troca por /grupos os caminhos /entrar e /cadastro', () => {
    expect(safeNext('/entrar')).toBe('/grupos');
    expect(safeNext('/cadastro?next=/convite/abc')).toBe('/grupos');
  });

  it('troca por /grupos um valor ausente', () => {
    expect(safeNext(null)).toBe('/grupos');
    expect(safeNext(undefined)).toBe('/grupos');
    expect(safeNext('')).toBe('/grupos');
  });
});
