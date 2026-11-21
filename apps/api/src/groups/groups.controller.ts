import type {
  GroupDetail,
  MyGroupsResponse,
  SessionUser,
} from '@amigo-secreto/shared';
import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { GroupInputDto } from './dto/group-input.dto.js';
import { GroupsService } from './groups.service.js';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Post()
  create(
    @CurrentUser() user: SessionUser,
    @Body() body: GroupInputDto,
  ): Promise<GroupDetail> {
    return this.groups.create(user, body);
  }

  @Get()
  listMine(@CurrentUser() user: SessionUser): Promise<MyGroupsResponse> {
    return this.groups.listMine(user.id);
  }
}
