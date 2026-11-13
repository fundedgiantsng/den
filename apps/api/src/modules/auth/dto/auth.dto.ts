import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, IsEnum, IsOptional } from 'class-validator';

export enum LoginIdentifierType {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
}

export class RequestOtpDto {
  @ApiProperty({
    description: 'Login identifier: email address or E.164 phone number (e.g. +2348012345678)',
    example: '+2348012345678',
  })
  @IsNotEmpty()
  @IsString()
  identifier!: string;

  @ApiProperty({
    enum: LoginIdentifierType,
    description: 'Type of identifier: EMAIL or PHONE',
    example: LoginIdentifierType.PHONE,
  })
  @IsNotEmpty()
  @IsEnum(LoginIdentifierType)
  type!: LoginIdentifierType;
}

export class RetryWhatsappOtpDto {
  @ApiProperty({
    description: 'E.164 Phone number for WhatsApp retry',
    example: '+2348012345678',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, { message: 'Phone number must be valid E.164 format' })
  phone!: string;
}

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Email or E.164 Phone number',
    example: '+2348012345678',
  })
  @IsNotEmpty()
  @IsString()
  identifier!: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  code!: string;
}
