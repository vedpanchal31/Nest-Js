import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { UsersModule } from './domain/users/users.module';
import { appconfig } from './config/app';
import { dbconfig } from './config/database';
import { DomainModule } from './domain/domain.module';
import { HealthController } from './health/health.controller';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { MailerGlobalModule } from './core/mailer/mailer-global.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  controllers: [HealthController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [appconfig, dbconfig] }),
    ScheduleModule.forRoot(),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: config.getOrThrow<string>('app.redis.host'),
            port: parseInt(config.getOrThrow<string>('app.redis.port')),
          },
        }),
      }),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('db.host'),
        port: configService.get<number>('db.port'),
        username: configService.get<string>('db.username'),
        password: configService.get<string>('db.password'),
        database: configService.get<string>('db.name'),
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('app.redis.host') || 'localhost',
          port: configService.get<number>('app.redis.port') || 6379,
        },
      }),
    }),
    MailerGlobalModule,
    DomainModule,
    UsersModule,
  ],
})
export class AppModule {}
