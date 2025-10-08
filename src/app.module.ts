import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Food, FoodCategory, FoodItem } from 'src/entities/index';
import { CrawlerProcessor } from 'src/workers/crawler.processor';
import { CrawlerService } from 'src/services/crawler.service';
import { CrawlerController } from 'src/controllers/crawler.controller';
import { getDatabaseConfig } from 'src/config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Food, FoodCategory, FoodItem]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    BullModule.registerQueue({
      name: 'crawler-queue',
    }),
  ],
  controllers: [CrawlerController],
  providers: [CrawlerProcessor, CrawlerService],
})
export class AppModule {}
