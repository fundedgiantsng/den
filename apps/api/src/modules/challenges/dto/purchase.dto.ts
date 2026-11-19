import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class PurchaseFromWalletDto {
  @ApiProperty({ example: 'rhino-rush', description: 'Plan SKU prefix' })
  @IsNotEmpty()
  @IsString()
  planType!: 'rhino-rush' | 'phoenix-rise';

  @ApiProperty({ example: 5000000, description: 'Account size in NGN' })
  @IsNotEmpty()
  @IsNumber()
  accountSizeNgn!: number;

  @ApiPropertyOptional({ example: 'WELCOME10', description: 'Admin or site promo code' })
  @IsOptional()
  @IsString()
  siteCouponCode?: string;

  @ApiPropertyOptional({ example: 'johndoe', description: 'Affiliate username or referral code' })
  @IsOptional()
  @IsString()
  affiliateCode?: string;
}

export class ValidateCouponsDto {
  @ApiPropertyOptional({ example: 'rhino-rush', description: 'Plan SKU prefix' })
  @IsOptional()
  @IsString()
  planType?: 'rhino-rush' | 'phoenix-rise';

  @ApiPropertyOptional({ example: 5000000, description: 'Account size in NGN' })
  @IsOptional()
  @IsNumber()
  accountSizeNgn?: number;

  @ApiPropertyOptional({ example: 'WELCOME10', description: 'Admin or site promo code' })
  @IsOptional()
  @IsString()
  siteCouponCode?: string;

  @ApiPropertyOptional({ example: 'WELCOME10', description: 'Direct coupon code alias' })
  @IsOptional()
  @IsString()
  couponCode?: string;

  @ApiPropertyOptional({ example: 'johndoe', description: 'Affiliate username or referral code' })
  @IsOptional()
  @IsString()
  affiliateCode?: string;
}
