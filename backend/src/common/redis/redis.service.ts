import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private redis: Redis;
  private redisPublisher: Redis;
  private redisSubscriber: Redis;
  private isConnected = false;
  private isRedisEnabled = true;
  /** Prevents repeated error log spam after connection failure has been acknowledged. */
  private hasLoggedConnectionFailure = false;

  constructor(private readonly configService: ConfigService) {
    this.isRedisEnabled = this.configService.get<string>('REDIS_ENABLED', 'true') === 'true';
  }

  async onModuleInit() {
    if (!this.isRedisEnabled) {
      this.logger.warn('⚠️ Redis is disabled. Running without caching.');
      return;
    }

    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://localhost:6379');
    const maxRetries = 3;
    const retryDelay = 2000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: maxRetries,
          retryStrategy: (times: number) => {
            if (times > maxRetries) {
              this.logger.warn(
                '⚠️ Redis connection failed after retries. Running without caching.',
              );
              return null;
            }
            const delay = attempt * retryDelay;
            this.logger.warn(
              `Redis connection attempt ${attempt} failed. Retrying in ${delay}ms...`,
            );
            return delay;
          },
          enableReadyCheck: true,
        });

        this.redisPublisher = new Redis(redisUrl, {
          maxRetriesPerRequest: maxRetries,
          // Don't auto-retry independently — main client governs the connection status
          retryStrategy: () => null,
        });

        this.redisSubscriber = new Redis(redisUrl, {
          maxRetriesPerRequest: maxRetries,
          retryStrategy: () => null,
        });

        this.redis.on('connect', () => {
          this.isConnected = true;
          this.hasLoggedConnectionFailure = false;
          this.logger.log('✅ Redis connected successfully');
        });

        this.redis.on('error', (error) => {
          if (this.isConnected) {
            this.logger.error('Redis connection error', error);
            this.isConnected = false;
          }
        });

        // Suppress repeated error logs from publisher/subscriber —
        // they mirror the main client's state and would otherwise spam the console.
        this.redisPublisher.on('error', () => {
          if (!this.hasLoggedConnectionFailure) {
            this.logger.warn('Redis publisher connection failed');
          }
        });

        this.redisSubscriber.on('error', () => {
          if (!this.hasLoggedConnectionFailure) {
            this.logger.warn('Redis subscriber connection failed');
          }
        });

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            this.logger.warn('Redis connection timeout');
            reject(new Error('Connection timeout'));
          }, 5000);

          this.redis.once('connect', () => {
            clearTimeout(timeout);
            resolve();
          });

          this.redis.once('error', (err) => {
            clearTimeout(timeout);
            reject(err);
          });
        });

        this.logger.log(`✅ Redis connected on attempt ${attempt}`);
        return;
      } catch (error) {
        this.logger.error(`Redis connection attempt ${attempt} failed`, error);

        // Disconnect orphan clients before retrying or giving up
        await this.disconnectQuietly();

        if (attempt === maxRetries) {
          this.logger.warn('⚠️ All Redis connection attempts failed. Running without caching.');
          this.hasLoggedConnectionFailure = true;
          this.isRedisEnabled = false;
        } else {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }
  }

  async onModuleDestroy() {
    await this.disconnectQuietly();
    this.logger.log('Redis disconnected');
  }

  /** Quietly disconnect all Redis clients, ignoring errors. */
  private async disconnectQuietly(): Promise<void> {
    for (const client of [this.redis, this.redisPublisher, this.redisSubscriber]) {
      try {
        client?.disconnect();
      } catch {
        // Intentionally swallowed — client may already be disconnected
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isRedisEnabled || !this.isConnected) {
      return null;
    }

    const value = await this.redis.get(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.isRedisEnabled || !this.isConnected) {
      return;
    }

    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

    if (ttl) {
      await this.redis.set(key, serializedValue, 'EX', ttl);
    } else {
      await this.redis.set(key, serializedValue);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isRedisEnabled || !this.isConnected) {
      return;
    }
    await this.redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    if (!this.isRedisEnabled || !this.isConnected) {
      return;
    }

    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.isRedisEnabled || !this.isConnected) {
      return 0;
    }
    return this.redis.incr(key);
  }

  async expire(key: string, ttl: number): Promise<void> {
    if (!this.isRedisEnabled || !this.isConnected) {
      return;
    }
    await this.redis.expire(key, ttl);
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isRedisEnabled || !this.isConnected) {
      return false;
    }
    const result = await this.redis.exists(key);
    return result === 1;
  }

  /**
   * Returns TTL in seconds. -2 means key does not exist; -1 means key exists
   * but has no associated expiration.
   */
  async ttl(key: string): Promise<number> {
    if (!this.isRedisEnabled || !this.isConnected) {
      return -2;
    }
    return this.redis.ttl(key);
  }

  async publish(channel: string, message: any): Promise<void> {
    if (!this.isRedisEnabled || !this.isConnected) {
      return;
    }
    await this.redisPublisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    if (!this.isRedisEnabled || !this.isConnected) {
      return;
    }
    await this.redisSubscriber.subscribe(channel);

    this.redisSubscriber.on('message', (receivedChannel, message) => {
      if (receivedChannel === channel) {
        try {
          const parsedMessage = JSON.parse(message);
          callback(parsedMessage);
        } catch (error) {
          this.logger.error('Failed to parse Redis message', error);
        }
      }
    });
  }

  async unsubscribe(channel: string): Promise<void> {
    if (!this.isRedisEnabled || !this.isConnected) {
      return;
    }
    await this.redisSubscriber.unsubscribe(channel);
  }

  async addToSet(key: string, member: string): Promise<void> {
    if (!this.isRedisEnabled || !this.isConnected) {
      return;
    }
    await this.redis.sadd(key, member);
  }

  async removeFromSet(key: string, member: string): Promise<void> {
    if (!this.isRedisEnabled || !this.isConnected) {
      return;
    }
    await this.redis.srem(key, member);
  }

  async getSetMembers(key: string): Promise<string[]> {
    if (!this.isRedisEnabled || !this.isConnected) {
      return [];
    }
    return this.redis.smembers(key);
  }

  async isSetMember(key: string, member: string): Promise<boolean> {
    if (!this.isRedisEnabled || !this.isConnected) {
      return false;
    }
    const result = await this.redis.sismember(key, member);
    return result === 1;
  }

  getClient(): Redis | null {
    return this.isRedisEnabled && this.isConnected ? this.redis : null;
  }

  getPublisher(): Redis | null {
    return this.isRedisEnabled && this.isConnected ? this.redisPublisher : null;
  }

  getSubscriber(): Redis | null {
    return this.isRedisEnabled && this.isConnected ? this.redisSubscriber : null;
  }

  isAvailable(): boolean {
    return this.isRedisEnabled && this.isConnected;
  }
}
