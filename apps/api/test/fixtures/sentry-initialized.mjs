// Roda depois do --import do instrument e informa se o Sentry foi inicializado.
import * as Sentry from '@sentry/nestjs';

process.stdout.write(String(Sentry.isInitialized()));
