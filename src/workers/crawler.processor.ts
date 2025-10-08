import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { TurkompCrawlerService } from 'src/services/turkomp-crawler.service';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

export interface CrawlerJobData {
  type: 'full-crawl' | 'category-crawl' | 'update-existing';
  category?: string;
  limit?: number;
}

@Processor('crawler-queue')
@Injectable()
export class CrawlerProcessor extends WorkerHost {
  private crawlerService: TurkompCrawlerService;

  constructor(private configService: ConfigService) {
    super();
    this.crawlerService = new TurkompCrawlerService(this.configService);
  }

  async process(job: Job<CrawlerJobData>): Promise<any> {
    const { type, category, limit } = job.data;

    try {
      await this.crawlerService.initialize();

      switch (type) {
        case 'full-crawl':
          return await this.performFullCrawl(job);
        
        case 'category-crawl':
          return await this.performCategoryCrawl(job, category);
        
        case 'update-existing':
          return await this.updateExistingFoods(job);
        
        default:
          throw new Error(`Unknown crawl type: ${type}`);
      }
    } catch (error) {
      console.error('Crawler job failed:', error);
      throw error;
    } finally {
      await this.crawlerService.close();
    }
  }

  private async performFullCrawl(job: Job<CrawlerJobData>): Promise<any> {
    console.log('Starting full crawl...');
    
    try {
      // İlerleme güncellemesi
      await job.updateProgress(10);
      
      const foods = await this.crawlerService.crawlAllFoods();
      
      await job.updateProgress(50);
      
      console.log(`Crawled ${foods.length} foods, saving to database...`);
      
      if (foods.length > 0) {
        await this.crawlerService.saveFoodsToDatabase(foods);
      } else {
        console.log('No foods to save');
      }
      
      await job.updateProgress(100);
      
      return {
        success: true,
        totalFoods: foods.length,
        message: `Successfully crawled and saved ${foods.length} foods`
      };
    } catch (error) {
      console.error('Full crawl failed:', error);
      throw error;
    }
  }

  private async performCategoryCrawl(job: Job<CrawlerJobData>, category?: string): Promise<any> {
    if (!category) {
      throw new Error('Category is required for category crawl');
    }

    console.log(`Starting category crawl for: ${category}`);
    
    await job.updateProgress(10);
    
    // Belirli kategori için crawl işlemi
    const foods = await this.crawlerService.crawlAllFoods(); // Bu kısım kategoriye özel olarak geliştirilebilir
    const categoryFoods = foods.filter(food => food.category === category);
    
    await job.updateProgress(50);
    
    console.log(`Crawled ${categoryFoods.length} foods for category ${category}`);
    await this.crawlerService.saveFoodsToDatabase(categoryFoods);
    
    await job.updateProgress(100);
    
    return {
      success: true,
      category,
      totalFoods: categoryFoods.length,
      message: `Successfully crawled and saved ${categoryFoods.length} foods for category ${category}`
    };
  }

  private async updateExistingFoods(job: Job<CrawlerJobData>): Promise<any> {
    console.log('Starting update of existing foods...');
    
    await job.updateProgress(10);
    
    // Mevcut gıdaları güncelle
    const foods = await this.crawlerService.crawlAllFoods();
    
    await job.updateProgress(50);
    
    console.log(`Updating ${foods.length} existing foods...`);
    await this.crawlerService.saveFoodsToDatabase(foods);
    
    await job.updateProgress(100);
    
    return {
      success: true,
      totalFoods: foods.length,
      message: `Successfully updated ${foods.length} foods`
    };
  }
}
