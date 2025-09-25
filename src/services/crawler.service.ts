import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface CrawlerJobData {
  type: 'full-crawl' | 'category-crawl' | 'update-existing';
  category?: string;
  limit?: number;
}

@Injectable()
export class CrawlerService {
  constructor(
    @InjectQueue('crawler-queue')
    private crawlerQueue: Queue,
  ) {}

  async startFullCrawl(): Promise<string> {
    const job = await this.crawlerQueue.add('crawl-all-foods', {
      type: 'full-crawl',
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return job.id;
  }

  async startCategoryCrawl(category: string): Promise<string> {
    const job = await this.crawlerQueue.add('crawl-category', {
      type: 'category-crawl',
      category,
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return job.id;
  }

  async updateExistingFoods(): Promise<string> {
    const job = await this.crawlerQueue.add('update-existing', {
      type: 'update-existing',
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });

    return job.id;
  }

  async getJobStatus(jobId: string): Promise<any> {
    const job = await this.crawlerQueue.getJob(jobId);
    
    if (!job) {
      return { status: 'not_found' };
    }

    return {
      id: job.id,
      status: await job.getState(),
      progress: job.progress,
      result: job.returnvalue,
      error: job.failedReason,
    };
  }

  async getAllJobs(): Promise<any[]> {
    const jobs = await this.crawlerQueue.getJobs(['waiting', 'active', 'completed', 'failed']);
    
    return Promise.all(jobs.map(async (job) => ({
      id: job.id,
      status: await job.getState(),
      progress: job.progress,
      result: job.returnvalue,
      error: job.failedReason,
      data: job.data,
      createdAt: new Date(job.timestamp),
    })));
  }
}
