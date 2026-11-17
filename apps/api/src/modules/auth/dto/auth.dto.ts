import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class SignupDto {
  @ApiProperty({ example: 'favourtrade', description: 'Unique trader username/handle' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9_]{3,20}$/, { message: 'Username must be 3-20 characters long and contain only lowercase letters, numbers, or underscores' })
  username!: string;

  @ApiProperty({ example: 'John' })
  @IsNotEmpty()
  @IsString()
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsNotEmpty()
  @IsString()
  lastName!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsNotEmpty()
  @IsString()
  email!: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsNotEmpty()
  @IsString()
  phone!: string;

  @ApiPropertyOptional({ example: '14 Admiralty Way, Lekki Phase 1, Lagos' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'giantstrader', description: 'Affiliate username or referral code' })
  @IsOptional()
  @IsString()
  referredBy?: string;
}

export class SetUsernameDto {
  @ApiProperty({ example: 'favourtrade', description: 'Unique user handle' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9_]{3,20}$/, { message: 'Username must be 3-20 characters long and contain only lowercase letters, numbers, or underscores' })
  username!: string;
}

export class NinjaBvnVerifyDto {
  @ApiProperty({ example: '22222222222', description: '11-digit Bank Verification Number' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{11}$/, { message: 'BVN must be exactly 11 digits' })
  bvn!: string;

  @ApiPropertyOptional({ example: 'trader@example.com' })
  @IsOptional()
  @IsString()
  email?: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'johndoe' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '14 Admiralty Way, Lekki Phase 1, Lagos' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'giantstrader', description: 'Affiliate username or referral code' })
  @IsOptional()
  @IsString()
  referredBy?: string;
}

