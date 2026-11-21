import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { validateEnvironment } from '../../src/config/env.validation.js';
import { DatabaseModule } from '../../src/database/database.module.js';
import { GroupsModule } from '../../src/groups/groups.module.js';
import { User } from '../../src/users/user.entity.js';

// O grupo e a participação apontam para o usuário: a entidade precisa estar
// registrada, como no AppModule pelo UsersModule.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    TypeOrmModule.forFeature([User]),
    GroupsModule,
  ],
})
export class GroupsFixtureModule {}
