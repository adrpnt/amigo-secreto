import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { User } from './user.entity.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  // Grava a data do opt-in só quando o valor muda.
  async updateProfile(
    userId: string,
    changes: { name?: string; marketingOptIn?: boolean },
  ): Promise<User> {
    const user = await this.users.findOneByOrFail({ id: userId });
    if (changes.name !== undefined) user.name = changes.name;
    if (
      changes.marketingOptIn !== undefined &&
      changes.marketingOptIn !== user.marketingOptIn
    ) {
      user.marketingOptIn = changes.marketingOptIn;
      user.marketingOptInAt = new Date();
    }
    return this.users.save(user);
  }
}
