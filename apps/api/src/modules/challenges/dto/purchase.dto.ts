import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class PurchaseFromWalletDto {
  @ApiProperty({ example: 'rhino-rush', description: 'Plan SKU prefix' })
  @IsNotEmpty()
  @IsString()
  planType!: 'rhino-rush' | 'phoenix-rise';

  @ApiProperty({ example: 5000000, description: 'Account size in NGN' })
  @IsNotEmpty()
  @IsNumber()
  accountSizeNgn!: number;
}
