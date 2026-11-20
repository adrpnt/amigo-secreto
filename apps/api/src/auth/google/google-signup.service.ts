import { TERMS_VERSION } from '@amigo-secreto/shared';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { BusinessEventsService } from '../../observability/business-events.service.js';
import { User } from '../../users/user.entity.js';
import type { CookieResponse } from '../cookies.js';
import type { GoogleCompleteDto } from '../dto/google-complete.dto.js';
import {
  type AccountOutcome,
  GoogleAuthService,
  type GoogleSignup,
} from './google-auth.service.js';

const SIGNUP_EXPIRED = {
  statusCode: 401,
  message: 'Entre com Google de novo para continuar.',
  error: 'Unauthorized',
};

const OTHER_GOOGLE = {
  statusCode: 409,
  message: 'Não foi possível entrar com Google. Tente de novo.',
  error: 'Conflict',
};

type SignupOutcome =
  | Exclude<AccountOutcome, { kind: 'signup' }>
  | { kind: 'created'; userId: string };

@Injectable()
export class GoogleSignupService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly googleAuth: GoogleAuthService,
    private readonly events: BusinessEventsService,
  ) {}

  // Nome e e-mail do Google para a tela "Complete seu cadastro".
  pending(signupCookie: string | undefined): { name: string; email: string } {
    const signup = this.signup(signupCookie);
    return { name: signup.name ?? '', email: signup.email };
  }

  // Cria a conta confirmada e vinculada; se a situação mudou desde o retorno
  // do Google, segue as regras do retorno (vincula, entra ou recusa).
  async complete(
    dto: GoogleCompleteDto,
    signupCookie: string | undefined,
    response: CookieResponse,
    currentSessionId: string | undefined,
  ): Promise<{ next: string }> {
    const signup = this.signup(signupCookie);

    const outcome = await this.dataSource.transaction(
      async (manager): Promise<SignupOutcome> => {
        const existing = await this.googleAuth.resolveAccount(signup, manager);
        if (existing.kind !== 'signup') return existing;

        const now = new Date();
        // Os índices únicos de email e googleId decidem a corrida com outro
        // cadastro; quem perde segue as regras do retorno.
        const result = await manager
          .createQueryBuilder()
          .insert()
          .into(User)
          .values({
            name: dto.name,
            email: signup.email,
            googleId: signup.sub,
            avatarUrl: signup.picture,
            emailVerifiedAt: now,
            termsVersion: TERMS_VERSION,
            termsAcceptedAt: now,
            marketingOptIn: dto.marketingOptIn ?? false,
            marketingOptInAt: dto.marketingOptIn ? now : null,
          })
          .orIgnore()
          .returning(['id'])
          .execute();
        const [created] = result.raw as { id: string }[];
        if (created) return { kind: 'created', userId: created.id };

        const raced = await this.googleAuth.resolveAccount(signup, manager);
        // Sem conta depois do conflito: ela foi apagada nesse meio-tempo.
        return raced.kind === 'signup'
          ? { kind: 'error', error: 'google' }
          : raced;
      },
    );

    if (outcome.kind === 'error') throw new ConflictException(OTHER_GOOGLE);
    if (outcome.kind === 'created') {
      this.events.record('user.registered', {
        method: 'google',
        userId: outcome.userId,
      });
    }
    this.googleAuth.clearSignup(response);
    await this.googleAuth.openSession(
      {
        userId: outcome.userId,
        verifiedNow: outcome.kind === 'session' && outcome.verifiedNow,
      },
      response,
      currentSessionId,
    );
    return { next: signup.next };
  }

  private signup(value: string | undefined): GoogleSignup {
    const signup = this.googleAuth.readSignup(value);
    if (!signup) throw new UnauthorizedException(SIGNUP_EXPIRED);
    return signup;
  }
}
