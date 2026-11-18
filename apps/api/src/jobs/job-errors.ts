// Falha que repetir não resolve: o job vira FAILED na hora.
// Qualquer outro erro lançado por um handler é passageiro.
export class PermanentJobError extends Error {
  override name = 'PermanentJobError';
}
