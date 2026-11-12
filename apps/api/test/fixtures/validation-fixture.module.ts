import { Body, Controller, HttpCode, Module, Post } from '@nestjs/common';
import { IsInt, IsString, Min, MinLength } from 'class-validator';

export class ValidationFixtureDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsInt()
  @Min(0)
  age: number;
}

export const receivedBodies: ValidationFixtureDto[] = [];

@Controller('fixtures/validation')
class ValidationFixtureController {
  @Post()
  @HttpCode(200)
  create(@Body() body: ValidationFixtureDto): ValidationFixtureDto {
    receivedBodies.push(body);
    return body;
  }
}

@Module({ controllers: [ValidationFixtureController] })
export class ValidationFixtureModule {}
