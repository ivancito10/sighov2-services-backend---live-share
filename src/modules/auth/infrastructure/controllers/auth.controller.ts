import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { LoginUseCase } from '../../application/use-cases/login.use-case';
import { LoginDto } from '../../application/dtos/login.dto';
import { Public } from '../jwt/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly loginUseCase: LoginUseCase) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return await this.loginUseCase.ejecutar(dto);
  }
}
