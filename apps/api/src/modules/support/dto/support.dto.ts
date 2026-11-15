import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { TicketCategory, TicketPriority, TicketStatus } from '@fundedgiants/database';

export class CreateTicketDto {
  @ApiProperty({ example: 'Question regarding Rhino Rush daily profit cap' })
  @IsNotEmpty()
  @IsString()
  subject!: string;

  @ApiProperty({ enum: TicketCategory, default: TicketCategory.RULES })
  @IsEnum(TicketCategory)
  category!: TicketCategory;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.NORMAL })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiProperty({ example: 'I would like to clarify if the 2% profit cap reset occurs at 00:00 server time.' })
  @IsNotEmpty()
  @IsString()
  message!: string;

  @ApiPropertyOptional({ example: '#FG-48291' })
  @IsOptional()
  @IsString()
  relatedAccountId?: string;
}

export class ReplyTicketDto {
  @ApiProperty({ example: 'Thank you for the clarification, this helps.' })
  @IsNotEmpty()
  @IsString()
  message!: string;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  status!: TicketStatus;

  @ApiPropertyOptional({ example: 'Agent Sarah' })
  @IsOptional()
  @IsString()
  assignedAgentName?: string;
}

export class SendLiveChatMessageDto {
  @ApiProperty({ example: 'Hello, I need help with my account provisioning.' })
  @IsNotEmpty()
  @IsString()
  message!: string;
}
