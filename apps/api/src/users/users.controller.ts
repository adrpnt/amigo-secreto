import type { SessionUser } from '@amigo-secreto/shared';
import { Body, Controller, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { toSessionUser } from '../auth/session-user.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

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
}
