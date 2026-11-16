import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { NotificationCategory, NotificationPriority } from '@fundedgiants/database';

export class CreateNotificationDto {
  @ApiProperty({ example: 'Trading Milestone Reached' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Congratulations! You have successfully passed Phase 1 of Rhino Rush #FG-48291.' })
  @IsNotEmpty()
  @IsString()
  message!: string;

  @ApiPropertyOptional({ enum: NotificationCategory, default: NotificationCategory.SYSTEM })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional({ enum: NotificationPriority, default: NotificationPriority.NORMAL })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ example: '/dashboard/trading-accounts' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}

export class CreateBroadcastDto {
  @ApiProperty({ example: 'Scheduled Weekend Platform Maintenance & Trading Hours' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({ example: 'Please be advised that SteraTrader server maintenance will take place this Saturday from 02:00 to 04:00 UTC.' })
  @IsNotEmpty()
  @IsString()
  message!: string;

  @ApiPropertyOptional({ enum: NotificationCategory, default: NotificationCategory.BROADCAST })
  @IsOptional()
  @IsEnum(NotificationCategory)
  category?: NotificationCategory;

  @ApiPropertyOptional({ enum: NotificationPriority, default: NotificationPriority.NORMAL })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({ example: 'ALL', description: 'ALL or SPECIFIC_EMAILS' })
  @IsOptional()
  @IsString()
  targetAudience?: 'ALL' | 'SPECIFIC_EMAILS';

  @ApiPropertyOptional({ example: 'trader1@example.com, trader2@example.com' })
  @IsOptional()
  @IsString()
  targetEmails?: string;

  @ApiPropertyOptional({ example: 'https://fundedgiants.ng' })
  @IsOptional()
  @IsString()
  actionUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  sendEmail?: boolean;
}
