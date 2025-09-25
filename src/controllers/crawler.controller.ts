import { Controller, Post, Get, Param, Body, HttpException, HttpStatus } from '@nestjs/common';
import { CrawlerService } from '../services/crawler.service';

@Controller('crawler')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Post('start-full-crawl')
  async startFullCrawl() {
    try {
      const jobId = await this.crawlerService.startFullCrawl();
      return {
        success: true,
        jobId,
        message: 'Full crawl job started successfully'
      };
    } catch (error) {
      throw new HttpException(
        'Failed to start full crawl',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('start-category-crawl')
  async startCategoryCrawl(@Body() body: { category: string }) {
    try {
      if (!body.category) {
        throw new HttpException('Category is required', HttpStatus.BAD_REQUEST);
      }

      const jobId = await this.crawlerService.startCategoryCrawl(body.category);
      return {
        success: true,
        jobId,
        message: `Category crawl job started for ${body.category}`
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to start category crawl',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('update-existing')
  async updateExistingFoods() {
    try {
      const jobId = await this.crawlerService.updateExistingFoods();
      return {
        success: true,
        jobId,
        message: 'Update existing foods job started successfully'
      };
    } catch (error) {
      throw new HttpException(
        'Failed to start update job',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('job/:jobId')
  async getJobStatus(@Param('jobId') jobId: string) {
    try {
      const status = await this.crawlerService.getJobStatus(jobId);
      return {
        success: true,
        status
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get job status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('jobs')
  async getAllJobs() {
    try {
      const jobs = await this.crawlerService.getAllJobs();
      return {
        success: true,
        jobs
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get jobs',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
