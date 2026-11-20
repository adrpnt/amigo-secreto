import type { SessionUser } from '@amigo-secreto/shared';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { AuthRequest } from '../auth/auth-request.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { toSessionUser } from '../auth/session-user.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { PasswordChangeService } from './password-change.service.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly passwordChange: PasswordChangeService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: SessionUser): SessionUser {
    return user;
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: SessionUser,
    @Body() body: UpdateProfileDto,
  ): Promise<SessionUser> {
    return toSessionUser(await this.users.updateProfile(user.id, body));
  }

  @Post('me/password')
  @HttpCode(200)
  async changePassword(
    @Req() request: AuthRequest,
    @Body() body: ChangePasswordDto,
  ): Promise<SessionUser> {
    // Rota com sessão: o SessionGuard já preencheu request.auth.
    const { user, session } = request.auth!;
    return toSessionUser(
      await this.passwordChange.change(user.id, session.id, body),
    );
  }
}
