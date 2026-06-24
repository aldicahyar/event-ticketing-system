import { Controller, Get } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get()
  async check() {
    let dbStatus = 'disconnected';
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'disconnected';
    }

    const redisStatus = this.redisService.isAvailable() ? 'connected' : 'disconnected';

    const allHealthy = dbStatus === 'connected' && redisStatus === 'connected';

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: dbStatus,
        redis: redisStatus,
      },
    };
  }
}
