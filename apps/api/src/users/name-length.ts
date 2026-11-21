import { ValidateBy, type ValidationOptions } from 'class-validator';

export const NAME_MIN_LENGTH = 1;
export const NAME_MAX_LENGTH = 80;

// Mede o nome em pontos de código, como o varchar do Postgres. O @Length do
// class-validator desconta seletores de variação (U+FE0F) e aceitaria nomes
// que estouram a coluna.
export function NameLength(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'nameLength',
      validator: {
        validate: (value: unknown) => {
          if (typeof value !== 'string') return false;
          const length = [...value].length;
          return length >= NAME_MIN_LENGTH && length <= NAME_MAX_LENGTH;
        },
        defaultMessage: () =>
          `$property must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`,
      },
    },
    options,
  );
}
