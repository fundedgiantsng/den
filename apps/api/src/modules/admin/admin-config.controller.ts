import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { DeviceBindingGuard } from './device-binding.guard';
import * as fs from 'fs';
import * as path from 'path';

export class UpdateConfigDto {
  lencoApiKey?: string;
  lencoWebhookSecret?: string;
  ninjaKycApiKey?: string;
  ninjaKycWebhookSecret?: string;
  robaseApiKey?: string;
  steraTraderApiKey?: string;
  wooCommerceConsumerKey?: string;
  wooCommerceConsumerSecret?: string;
  wooCommerceWebhookSecret?: string;
}

@Controller('admin/config')
@UseGuards(DeviceBindingGuard)
export class AdminConfigController {
  private readonly logger = new Logger(AdminConfigController.name);
  private readonly envPath = path.resolve(process.cwd(), '../../.env');

  @Get('status')
  getConfigStatus() {
    return {
      success: true,
      boundHardwareId: '4C4C4544-0034-4C10-8034-C4C04F584433',
      deviceProtection: 'ACTIVE',
      envExists: fs.existsSync(this.envPath),
    };
  }

  @Post('credentials')
  @HttpCode(HttpStatus.OK)
  updateCredentials(@Body() dto: UpdateConfigDto) {
    try {
      let currentEnv = fs.existsSync(this.envPath)
        ? fs.readFileSync(this.envPath, 'utf8')
        : '';

      const updateKey = (key: string, value: string | undefined) => {
        if (!value) return;
        const regex = new RegExp(`^${key}=.*$`, 'm');
        if (regex.test(currentEnv)) {
          currentEnv = currentEnv.replace(regex, `${key}="${value}"`);
        } else {
          currentEnv += `\n${key}="${value}"`;
        }
      };

      updateKey('LENCO_API_KEY', dto.lencoApiKey);
      updateKey('LENCO_WEBHOOK_SECRET', dto.lencoWebhookSecret);
      updateKey('NINJA_KYC_API_KEY', dto.ninjaKycApiKey);
      updateKey('NINJA_KYC_WEBHOOK_SECRET', dto.ninjaKycWebhookSecret);
      updateKey('ROBASE_API_KEY', dto.robaseApiKey);
      updateKey('STERATRADER_API_KEY', dto.steraTraderApiKey);
      updateKey('WOOCOMMERCE_CONSUMER_KEY', dto.wooCommerceConsumerKey);
      updateKey('WOOCOMMERCE_CONSUMER_SECRET', dto.wooCommerceConsumerSecret);
      updateKey('WOOCOMMERCE_WEBHOOK_SECRET', dto.wooCommerceWebhookSecret);

      fs.writeFileSync(this.envPath, currentEnv.trim() + '\n', 'utf8');

      this.logger.log('Live API credentials securely updated into .env via bound device');

      return {
        success: true,
        message: 'Credentials successfully loaded into production environment.',
      };
    } catch (error: any) {
      this.logger.error('Failed to write .env file:', error);
      throw error;
    }
  }
}
