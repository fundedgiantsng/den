import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CopyMode } from '@fundedgiants/database';

export class SubscribeToMasterDto {
  @ApiProperty({ description: 'ID of the master trader to copy' })
  masterTraderId!: string;

  @ApiProperty({ description: 'Capital allocated to copy from Giants Vault (in NGN)', example: 1000000 })
  allocatedCapitalNgn!: number;

  @ApiPropertyOptional({
    description: 'Copy sizing mode: PROPORTIONAL_EQUITY, FIXED_LOT, or MULTIPLIER',
    enum: CopyMode,
    default: CopyMode.PROPORTIONAL_EQUITY,
  })
  copyMode?: CopyMode;

  @ApiPropertyOptional({ description: 'Lot size if FIXED_LOT mode is chosen', example: 0.1 })
  fixedLotSize?: number;

  @ApiPropertyOptional({ description: 'Multiplier factor if MULTIPLIER mode is chosen', example: 1.0 })
  multiplier?: number;

  @ApiPropertyOptional({ description: 'Stop loss threshold in NGN equity. If equity drops below this, copy stops automatically.' })
  stopLossEquityNgn?: number;

  @ApiPropertyOptional({ description: 'Max daily loss threshold in NGN' })
  maxDailyLossNgn?: number;
}

export class UpdateCopySettingsDto {
  @ApiPropertyOptional({ description: 'Stop loss equity threshold in NGN' })
  stopLossEquityNgn?: number;

  @ApiPropertyOptional({ description: 'Max daily loss threshold in NGN' })
  maxDailyLossNgn?: number;

  @ApiPropertyOptional({ description: 'Multiplier ratio' })
  multiplier?: number;
}
