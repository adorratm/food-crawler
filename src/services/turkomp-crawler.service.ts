import puppeteer, { Browser, Page } from 'puppeteer';
import { Food, FoodCategory, FoodItem } from '../entities/index';
import { getDatabaseConfig } from '../config/database.config';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Injectable } from '@nestjs/common';

export interface TurkompFoodData {
  href: string;
  turkompId: string;
  name: string;
  nameEn?: string;
  category: string;
  subCategory?: string;
  description?: string;
  nutritionalValues: {
    energy?: number;
    protein?: number;
    carbohydrate?: number;
    fat?: number;
    saturatedFat?: number;
    monounsaturatedFat?: number;
    polyunsaturatedFat?: number;
    cholesterol?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    potassium?: number;
    calcium?: number;
    iron?: number;
    zinc?: number;
    vitaminA?: number;
    vitaminC?: number;
    vitaminD?: number;
    vitaminE?: number;
    thiamine?: number;
    riboflavin?: number;
    niacin?: number;
    vitaminB6?: number;
    folate?: number;
    vitaminB12?: number;
    phosphorus?: number;
    magnesium?: number;
    selenium?: number;
    copper?: number;
    manganese?: number;
    iodine?: number;
    chromium?: number;
    molybdenum?: number;
    fluoride?: number;
    water?: number;
    ash?: number;
  };
  nutritionalUnits?: {
    energy?: string;
    protein?: string;
    carbohydrate?: string;
    fat?: string;
    saturatedFat?: string;
    monounsaturatedFat?: string;
    polyunsaturatedFat?: string;
    cholesterol?: string;
    fiber?: string;
    sugar?: string;
    sodium?: string;
    potassium?: string;
    calcium?: string;
    iron?: string;
    zinc?: string;
    vitaminA?: string;
    vitaminC?: string;
    vitaminD?: string;
    vitaminE?: string;
    thiamine?: string;
    riboflavin?: string;
    niacin?: string;
    vitaminB6?: string;
    folate?: string;
    vitaminB12?: string;
    phosphorus?: string;
    magnesium?: string;
    selenium?: string;
    copper?: string;
    manganese?: string;
    iodine?: string;
    chromium?: string;
    molybdenum?: string;
    fluoride?: string;
    water?: string;
    ash?: string;
  };
}

@Injectable()
export class TurkompCrawlerService {
  private browser: Browser | null = null;
  private baseUrl = 'https://turkomp.tarimorman.gov.tr';
  private dataSource: DataSource;

  constructor(private configService: ConfigService) {}

  async initialize(): Promise<void> {
    // DataSource'u başlat
    const config: DataSourceOptions = {
      type: 'postgres',
      host: this.configService.get('DB_HOST', 'localhost'),
      port: this.configService.get('DB_PORT', 5432),
      username: this.configService.get('DB_USERNAME', 'postgres'),
      password: this.configService.get('DB_PASSWORD', ''),
      database: this.configService.get('DB_NAME', 'dieticianapp'),
      entities: [Food, FoodCategory, FoodItem], // Tüm entity'leri import et
      synchronize: this.configService.get('NODE_ENV') === 'development',
      logging: this.configService.get('NODE_ENV') === 'development',
    };
    this.dataSource = new DataSource(config);
    await this.dataSource.initialize();

    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-sync',
        '--disable-translate',
        '--hide-scrollbars',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--safebrowsing-disable-auto-update',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--ignore-certificate-errors-spki-list',
        '--allow-running-insecure-content',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--disable-prompt-on-repost',
        '--disable-hang-monitor',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-domain-reliability',
        '--disable-features=AudioServiceOutOfProcess',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ],
      timeout: 120000,
      ignoreDefaultArgs: ['--disable-extensions'],
      protocolTimeout: 120000,
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  async crawlAllFoods(): Promise<TurkompFoodData[]> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();
    const allFoods: TurkompFoodData[] = [];

    try {
      // Sayfa ayarları
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Request interception
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        const resourceType = request.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          request.abort();
        } else {
          request.continue();
        }
      });
      
      // Ana sayfaya git - retry mekanizması ile
      let pageLoaded = false;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (!pageLoaded && retryCount < maxRetries) {
        try {
          console.log(`Attempting to load page (attempt ${retryCount + 1}/${maxRetries})...`);
          let goingPageUrl = `${this.baseUrl}/database?type=foods`;
          console.log(`Going to page: ${goingPageUrl}`);
          await page.goto(goingPageUrl, { 
            waitUntil: 'networkidle2',
            timeout: 60000 
          });
          
          // Sayfa tamamen yüklenene kadar bekle
          await this.delay(5000);
          
          // Sayfanın yüklendiğini doğrula
          const pageTitle = await page.title();
          console.log(`Page title: ${pageTitle}`);
          
          // Sayfa içeriğinin yüklendiğini kontrol et
          const bodyContent = await page.evaluate(() => document.body.innerHTML.length);
          console.log(`Page body content length: ${bodyContent}`);
          
          pageLoaded = true;
          console.log('Page loaded successfully!');
        } catch (error) {
          retryCount++;
          console.error(`Attempt ${retryCount} failed:`, error.message);
          
          if (retryCount >= maxRetries) {
            console.error('All attempts failed, using mock data');
          }
          
          // Retry öncesi bekle
          await this.delay(5000);
        }
      }

      // Kategori listesini al
      const categories = await this.getCategories(page);
      console.log(`Found ${categories.length} categories`);

      // Eğer kategori bulunamazsa, ana sayfadan direkt besinleri almaya çalış
      if (categories.length === 0) {
        console.log('No categories found, trying to get foods directly from main page...');
        const directFoods = await this.getFoodsFromPage(page, 'Genel');
        allFoods.push(...directFoods);
        console.log(`Found ${directFoods.length} foods directly from main page`);
      }

      for (const category of categories) {
        try {
          console.log(`\n=== Crawling category: ${category.name} ===`);
          const categoryFoods = await this.crawlCategory(page, category);
          
          if (categoryFoods.length === 0) {
            console.log(`No foods found for category: ${category.name}`);
          } else {
            allFoods.push(...categoryFoods);
            console.log(`✅ Successfully added ${categoryFoods.length} foods for category: ${category.name}`);
            
            // İlk birkaç besini logla
            categoryFoods.slice(0, 3).forEach((food, index) => {
              console.log(`  ${index + 1}. ${food.name} (ID: ${food.turkompId})`);
            });
          }
          
          // Rate limiting
          await this.delay(2000);
        } catch (error) {
          console.error(`❌ Error crawling category ${category.name}:`, error);
        }
      }

      console.log(`\n🎉 Crawling completed!`);
      console.log(`📊 Total foods found: ${allFoods.length}`);
      console.log(`📋 Categories processed: ${categories.length}`);
      
      if (allFoods.length > 0) {
        console.log(`\n📝 Sample foods:`);
        allFoods.slice(0, 5).forEach((food, index) => {
          console.log(`  ${index + 1}. ${food.name} (${food.category})`);
        });
      }
      
      return allFoods;
    } finally {
      await page.close();
    }
  }

  private async getCategories(page: Page): Promise<Array<{ name: string; url: string }>> {
    console.log(`Getting categories from page...`);
    
    // Sayfa yüklenene kadar bekle
    await this.delay(3000);
    
    const categories = await page.evaluate(() => {
      console.log(`Getting categories...`);
      
      // Önce sayfanın HTML yapısını kontrol et
      const body = document.body.innerHTML;
      console.log(`Page HTML length: ${body.length}`);
      
      // Sol sidebar'daki kategorileri bul - "Gıdaya göre" bölümü
      const categories: Array<{ name: string; url: string }> = [];
      
      // Farklı seçicileri dene - sol sidebar için
      const sidebarSelectors = [
        'div[class*="sidebar"] a',
        'div[class*="menu"] a',
        'div[class*="nav"] a',
        'aside a',
        '.sidebar a',
        '.menu a',
        '.navigation a'
      ];
      
      let foundCategories = false;
      
      for (const selector of sidebarSelectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`Sidebar selector "${selector}" found ${elements.length} elements`);
        
        elements.forEach((element) => {
          const link = element as HTMLAnchorElement;
          const name = link.textContent?.trim() || '';
          const url = link.href || '';
          
          // Kategori linklerini filtrele - dil seçimi ve navigasyon linklerini hariç tut
          if (name && url && 
              !name.match(/^(EN|TR|Gıdaya göre|Ana Sayfa|Hakkında|İletişim)$/i) &&
              !url.includes('langcode=') &&
              !url.includes('type=language') &&
              name.length > 2) {
            
            console.log(`Found category: "${name}" - "${url}"`);
            categories.push({ name, url });
            foundCategories = true;
          }
        });
        
        if (foundCategories) break;
      }
      
      // Eğer sidebar'da kategori bulunamazsa, ana tablodaki "Grup" sütununu kontrol et
      if (categories.length === 0) {
        console.log('No categories found in sidebar, checking main table...');
        
        const tableSelectors = [
          '#mydatalist',
          'table',
          '.data-table',
          '.food-table'
        ];
        
        for (const selector of tableSelectors) {
          const table = document.querySelector(selector);
          if (table) {
            console.log(`Found table with selector: ${selector}`);
            const rows = table.querySelectorAll('tr');
            console.log(`Table has ${rows.length} rows`);
            
            // İlk satır başlık olabilir, atla
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              const cells = row.querySelectorAll('td, th');
              
              // "Grup" sütununu bul (genellikle ilk veya ikinci sütun)
              for (let j = 0; j < Math.min(cells.length, 3); j++) {
                const cell = cells[j];
                const cellText = cell.textContent?.trim() || '';
                
                // Grup adı gibi görünen hücreleri kontrol et
                if (cellText && cellText.length > 2 && 
                    !cellText.match(/^(EN|TR|Gıdaya göre|Ana Sayfa|Hakkında|İletişim)$/i)) {
                  
                  // Bu hücrede link var mı kontrol et
                  const link = cell.querySelector('a');
                  if (link) {
                    const name = link.textContent?.trim() || '';
                    const url = link.href || '';
                    if (name && url) {
                      console.log(`Found category in table: "${name}" - "${url}"`);
                      categories.push({ name, url });
                    }
                  } else {
                    // Link yoksa, bu bir kategori adı olabilir
                    console.log(`Found potential category name: "${cellText}"`);
                    categories.push({ 
                      name: cellText, 
                      url: `/database?type=foods&category=${encodeURIComponent(cellText)}` 
                    });
                  }
                }
              }
            }
            
            if (categories.length > 0) break;
          }
        }
      }
      
      // Eğer hala kategori bulunamazsa, tüm linkleri listele (debug için)
      if (categories.length === 0) {
        console.log('No categories found, listing all links for debugging...');
        const allLinks = document.querySelectorAll('a');
        console.log(`Total links on page: ${allLinks.length}`);
        allLinks.forEach((link, index) => {
          if (index < 20) { // İlk 20 linki logla
            console.log(`Link ${index}: "${link.textContent?.trim()}" - "${link.href}"`);
          }
        });
      }

      console.log(`Found ${categories.length} valid categories`);
      return categories;
    });

    return categories;
  }

  private async crawlCategory(page: Page, category: { name: string; url: string }): Promise<TurkompFoodData[]> {
    const foods: TurkompFoodData[] = [];

    try {
      console.log(`Crawling category: ${category.name} with URL: ${category.url}`);
      
      // Eğer URL /database ise veya kategori adı ile arama yapılacaksa
      if (category.url === '/database' || category.url.includes('type=foods')) {
        return await this.searchByCategoryName(page, category.name);
      }

      // Eğer URL tam URL ise (http ile başlıyorsa)
      if (category.url.startsWith('http')) {
        await page.goto(category.url, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 
        });
      } else {
        // Göreceli URL ise base URL ile birleştir
        await page.goto(`${this.baseUrl}${category.url}`, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 
        });
      }
      
      // Sayfa yüklenene kadar bekle
      await this.delay(3000);

      // Sayfalama kontrolü
      let currentPage = 1;
      let hasNextPage = true;

      while (hasNextPage) {
        const pageFoods = await this.getFoodsFromPage(page, category.name);
        foods.push(...pageFoods);

        // Sonraki sayfa var mı kontrol et
        hasNextPage = await this.hasNextPage(page);
        if (hasNextPage) {
          currentPage++;
          await this.goToNextPage(page, currentPage);
          await this.delay(500);
        }
      }
    } catch (error) {
      console.error(`Error crawling category ${category.name}:`, error);
      // Hata durumunda arama yapmayı dene
      try {
        console.log(`Trying search for category ${category.name} as fallback...`);
        const searchResults = await this.searchByCategoryName(page, category.name);
        foods.push(...searchResults);
      } catch (searchError) {
        console.error(`Search fallback also failed for ${category.name}:`, searchError);
      }
    }

    return foods;
  }

  private async getFoodsFromPage(page: Page, categoryName: string): Promise<TurkompFoodData[]> {
    console.log(`Getting foods from page for category: ${categoryName}`);
    
    const foods = await page.evaluate((category) => {
      const foods: TurkompFoodData[] = [];
      console.log(`Starting food extraction for category: ${category}`);

      // Önce #mydatalist tablosunu bul
      let foodTable = document.querySelector('#mydatalist');
      
      if (!foodTable) {
        console.log('mydatalist table not found, trying other selectors...');
        // Farklı seçicileri dene
        const selectors = [
          'table',
          '.food-list',
          '.product-list',
          '[class*="food"]',
          '[class*="product"]'
        ];

        for (const selector of selectors) {
          foodTable = document.querySelector(selector);
          if (foodTable) {
            console.log(`Found food table with selector: ${selector}`);
            break;
          }
        }
      } else {
        console.log('Found mydatalist table');
      }

      if (foodTable) {
        const rows = foodTable.querySelectorAll('tr');
        console.log(`Found ${rows.length} rows in table`);
        
        rows.forEach((row, index) => {
          // İlk satır başlık olabilir, atla
          if (index === 0) return;
          
          const cells = row.querySelectorAll('td, th');
          console.log(`Row ${index} has ${cells.length} cells`);
          
          if (cells.length >= 3) { // Gıda, Kod, Grup sütunları
            const foodCell = cells[0]; // Gıda Adı sütunu
            const groupCell = cells[2]; // Grup sütunu

            let name = '';
            let href = '';
            
            // Gıda adı ve URL'si
            const foodLink = foodCell.querySelector('a');
            if (foodLink) {
              name = foodLink.textContent?.trim() || '';
              href = foodLink.href || '';
            } else {
              name = foodCell.textContent?.trim() || '';
            }

            // Kategori ve alt kategoriler
            const categoryLinks = groupCell.querySelectorAll('a');
            let mainCategory = category;
            let subCategories: string[] = [];

            if (categoryLinks.length > 0) {
              mainCategory = categoryLinks[0].textContent?.replace('»', '').trim() || category;
              for (let i = 1; i < categoryLinks.length; i++) {
                subCategories.push(categoryLinks[i].textContent?.replace('»', '').trim() || '');
              }
            } else {
              // Link yoksa direkt metin içeriğini al
              const groupText = groupCell.textContent?.trim() || '';
              if (groupText) {
                const parts = groupText.split('»').map(p => p.trim()).filter(p => p.length > 0);
                if (parts.length > 0) {
                  mainCategory = parts[0];
                  subCategories = parts.slice(1);
                }
              }
            }
            
            if (name && name.length > 2) {
              const idMatch = href.match(/(\d+)/);
              const turkompId = idMatch ? idMatch[1] : `food-${Date.now()}-${index}`;

              console.log(`Found food: ${name} (ID: ${turkompId}, Category: ${mainCategory}, SubCategories: ${subCategories.join(', ')})`);
              foods.push({
                href,
                turkompId,
                name,
                category: mainCategory,
                subCategory: subCategories.length > 0 ? subCategories.join(', ') : undefined,
                nutritionalValues: {}
              });
            }
          }
        });
      }

      // Eğer tablo bulunamazsa, diğer seçicileri dene
      if (foods.length === 0) {
        console.log('No foods found in tables, trying other selectors...');
        const foodSelectors = [
          '.food-item',
          '.product-item',
          '[class*="food"]',
          '[class*="product"]',
          'a[href*="food"]',
          'a[href*="product"]'
        ];

        for (const selector of foodSelectors) {
          const foodElements = document.querySelectorAll(selector);
          console.log(`Selector "${selector}" found ${foodElements.length} elements`);
          
          foodElements.forEach((element, index) => {
            const link = element.tagName === 'A' ? element as HTMLAnchorElement : element.querySelector('a') as HTMLAnchorElement;
            if (link) {
              const name = link.textContent?.trim() || '';
              const href = link.href || '';
              
              if (name && name.length > 2) {
                const idMatch = href.match(/(\d+)/);
                const turkompId = idMatch ? idMatch[1] : Math.random().toString(36).substr(2, 9);

                console.log(`Found food via selector: ${name} (ID: ${turkompId})`);
                foods.push({
                  href,
                  turkompId,
                  name,
                  category,
                  nutritionalValues: {}
                });
              }
            }
          });
          
          if (foods.length > 0) break; // Besin bulduk, diğer seçicilere bakma
        }
      }

      console.log(`Total foods found: ${foods.length}`);
      return foods;
    }, categoryName);

    // Her gıda için detay sayfasını ziyaret et (isteğe bağlı)
    for (const food of foods) {
      try {
        const detailedFood = await this.getFoodDetails(page, food);
        if (detailedFood) {
          Object.assign(food, detailedFood);
          console.log(`Successfully got details for: ${food.name}`);
        } else {
          console.log(`No details available for: ${food.name}, keeping basic info`);
        }
      } catch (error) {
        console.error(`Error getting details for food ${food.name}:`, error);
        // Detay alınamazsa bile temel bilgileri koru
        console.log(`Keeping basic info for: ${food.name}`);
      }
    }

    return foods;
  }

  private async getFoodDetails(page: Page, food: TurkompFoodData): Promise<Partial<TurkompFoodData> | null> {
    try {
      // Eğer href varsa o sayfaya git, yoksa genel detay sayfasına git
      const detailUrl = food.href.startsWith('http') ? food.href : `${this.baseUrl}/food-${food.name.replaceAll(' ', '-')}-${food.turkompId}`;
      
      console.log(`Getting details for food: ${food.name} from URL: ${detailUrl}`);
      
      // Retry mekanizması ile detay sayfasına git
      let retryCount = 0;
      const maxRetries = 3;
      let pageLoaded = false;
      
      while (!pageLoaded && retryCount < maxRetries) {
        try {
          await page.goto(detailUrl, { 
            waitUntil: 'domcontentloaded', 
            timeout: 30000 
          });
          pageLoaded = true;
          console.log(`Successfully loaded details page for: ${food.name}`);
        } catch (error) {
          retryCount++;
          console.log(`Attempt ${retryCount} failed for ${food.name}: ${error.message}`);
          
          if (retryCount >= maxRetries) {
            console.log(`All attempts failed for ${food.name}, skipping details`);
            return null;
          }
          
          // Retry öncesi bekle
          await this.delay(2000);
        }
      }

      const details = await page.evaluate(() => {
        const nutritionalValues: any = {};
        const nutritionalUnits: any = {};

        // Önce #foodResultlist tablosunu ara
        let nutritionTable = document.querySelector('#foodResultlist');
        
        // Bulunamazsa diğer seçicileri dene
        if (!nutritionTable) {
          nutritionTable = document.querySelector('.nutrition-table, .food-nutrition, table');
        }

        if (nutritionTable) {
          const rows = nutritionTable.querySelectorAll('tr');
          console.log(`Found nutrition table with ${rows.length} rows`);
          
          rows.forEach((row, index) => {
            // İlk satır başlık olabilir, atla
            if (index === 0) return;
            
            const cells = row.querySelectorAll('td, th');
            console.log(`Nutrition row ${index} has ${cells.length} cells`);
            
            if (cells.length >= 3) { // Bileşen, Birim, Ortalama sütunları
              const component = cells[0].textContent?.trim() || '';
              const unit = cells[1].textContent?.trim() || '';
              const average = cells[2].textContent?.trim() || '';
              
              console.log(`Nutrition: ${component} - ${unit} - ${average}`);
              
              // Sayısal değeri çıkar (virgülü nokta ile değiştir)
              const numericValue = parseFloat(average.replace(/[^\d.,]/g, '').replace(',', '.'));
              if (!isNaN(numericValue)) {
                // Besin adını eşleştir (daha kapsamlı eşleştirme)
                const componentLower = component.toLowerCase();
                if (componentLower.includes('enerji') || componentLower.includes('kalori') || componentLower.includes('energy')) {
                  nutritionalValues.energy = numericValue;
                  nutritionalUnits.energy = unit;
                } else if (componentLower.includes('protein')) {
                  nutritionalValues.protein = numericValue;
                  nutritionalUnits.protein = unit;
                } else if (componentLower.includes('karbonhidrat') || componentLower.includes('carbohydrate')) {
                  nutritionalValues.carbohydrate = numericValue;
                  nutritionalUnits.carbohydrate = unit;
                } else if (componentLower.includes('yağ') && !componentLower.includes('doymuş') && !componentLower.includes('mono') && !componentLower.includes('poly')) {
                  nutritionalValues.fat = numericValue;
                  nutritionalUnits.fat = unit;
                } else if (componentLower.includes('doymuş yağ') || componentLower.includes('saturated')) {
                  nutritionalValues.saturatedFat = numericValue;
                  nutritionalUnits.saturatedFat = unit;
                } else if (componentLower.includes('tekli doymamış') || componentLower.includes('monounsaturated')) {
                  nutritionalValues.monounsaturatedFat = numericValue;
                  nutritionalUnits.monounsaturatedFat = unit;
                } else if (componentLower.includes('çoklu doymamış') || componentLower.includes('polyunsaturated')) {
                  nutritionalValues.polyunsaturatedFat = numericValue;
                  nutritionalUnits.polyunsaturatedFat = unit;
                } else if (componentLower.includes('kolesterol') || componentLower.includes('cholesterol')) {
                  nutritionalValues.cholesterol = numericValue;
                  nutritionalUnits.cholesterol = unit;
                } else if (componentLower.includes('lif') || componentLower.includes('fiber')) {
                  nutritionalValues.fiber = numericValue;
                  nutritionalUnits.fiber = unit;
                } else if (componentLower.includes('şeker') || componentLower.includes('sugar')) {
                  nutritionalValues.sugar = numericValue;
                  nutritionalUnits.sugar = unit;
                } else if (componentLower.includes('sodyum') || componentLower.includes('sodium')) {
                  nutritionalValues.sodium = numericValue;
                  nutritionalUnits.sodium = unit;
                } else if (componentLower.includes('potasyum') || componentLower.includes('potassium')) {
                  nutritionalValues.potassium = numericValue;
                  nutritionalUnits.potassium = unit;
                } else if (componentLower.includes('kalsiyum') || componentLower.includes('calcium')) {
                  nutritionalValues.calcium = numericValue;
                  nutritionalUnits.calcium = unit;
                } else if (componentLower.includes('demir') || componentLower.includes('iron')) {
                  nutritionalValues.iron = numericValue;
                  nutritionalUnits.iron = unit;
                } else if (componentLower.includes('çinko') || componentLower.includes('zinc')) {
                  nutritionalValues.zinc = numericValue;
                  nutritionalUnits.zinc = unit;
                } else if (componentLower.includes('a vitamini') || componentLower.includes('vitamin a')) {
                  nutritionalValues.vitaminA = numericValue;
                  nutritionalUnits.vitaminA = unit;
                } else if (componentLower.includes('c vitamini') || componentLower.includes('vitamin c')) {
                  nutritionalValues.vitaminC = numericValue;
                  nutritionalUnits.vitaminC = unit;
                } else if (componentLower.includes('d vitamini') || componentLower.includes('vitamin d')) {
                  nutritionalValues.vitaminD = numericValue;
                  nutritionalUnits.vitaminD = unit;
                } else if (componentLower.includes('e vitamini') || componentLower.includes('vitamin e')) {
                  nutritionalValues.vitaminE = numericValue;
                  nutritionalUnits.vitaminE = unit;
                } else if (componentLower.includes('b1 vitamini') || componentLower.includes('thiamine')) {
                  nutritionalValues.thiamine = numericValue;
                  nutritionalUnits.thiamine = unit;
                } else if (componentLower.includes('b2 vitamini') || componentLower.includes('riboflavin')) {
                  nutritionalValues.riboflavin = numericValue;
                  nutritionalUnits.riboflavin = unit;
                } else if (componentLower.includes('b3 vitamini') || componentLower.includes('niacin')) {
                  nutritionalValues.niacin = numericValue;
                  nutritionalUnits.niacin = unit;
                } else if (componentLower.includes('b6 vitamini') || componentLower.includes('vitamin b6')) {
                  nutritionalValues.vitaminB6 = numericValue;
                  nutritionalUnits.vitaminB6 = unit;
                } else if (componentLower.includes('folat') || componentLower.includes('folate')) {
                  nutritionalValues.folate = numericValue;
                  nutritionalUnits.folate = unit;
                } else if (componentLower.includes('b12 vitamini') || componentLower.includes('vitamin b12')) {
                  nutritionalValues.vitaminB12 = numericValue;
                  nutritionalUnits.vitaminB12 = unit;
                } else if (componentLower.includes('fosfor') || componentLower.includes('phosphorus')) {
                  nutritionalValues.phosphorus = numericValue;
                  nutritionalUnits.phosphorus = unit;
                } else if (componentLower.includes('magnezyum') || componentLower.includes('magnesium')) {
                  nutritionalValues.magnesium = numericValue;
                  nutritionalUnits.magnesium = unit;
                } else if (componentLower.includes('selenyum') || componentLower.includes('selenium')) {
                  nutritionalValues.selenium = numericValue;
                  nutritionalUnits.selenium = unit;
                } else if (componentLower.includes('bakır') || componentLower.includes('copper')) {
                  nutritionalValues.copper = numericValue;
                  nutritionalUnits.copper = unit;
                } else if (componentLower.includes('mangan') || componentLower.includes('manganese')) {
                  nutritionalValues.manganese = numericValue;
                  nutritionalUnits.manganese = unit;
                } else if (componentLower.includes('iyot') || componentLower.includes('iodine')) {
                  nutritionalValues.iodine = numericValue;
                  nutritionalUnits.iodine = unit;
                } else if (componentLower.includes('krom') || componentLower.includes('chromium')) {
                  nutritionalValues.chromium = numericValue;
                  nutritionalUnits.chromium = unit;
                } else if (componentLower.includes('molibden') || componentLower.includes('molybdenum')) {
                  nutritionalValues.molybdenum = numericValue;
                  nutritionalUnits.molybdenum = unit;
                } else if (componentLower.includes('florür') || componentLower.includes('fluoride')) {
                  nutritionalValues.fluoride = numericValue;
                  nutritionalUnits.fluoride = unit;
                } else if (componentLower.includes('su') || componentLower.includes('water')) {
                  nutritionalValues.water = numericValue;
                  nutritionalUnits.water = unit;
                } else if (componentLower.includes('kül') || componentLower.includes('ash')) {
                  nutritionalValues.ash = numericValue;
                  nutritionalUnits.ash = unit;
                }
              }
            }
          });
        }

        // İngilizce isim
        const englishName = document.querySelector('.english-name, .name-en')?.textContent?.trim();

        // Açıklama
        const description = document.querySelector('.description, .food-description')?.textContent?.trim();

        return {
          nameEn: englishName,
          description,
          nutritionalValues,
          nutritionalUnits
        };
      });

      return details;
    } catch (error) {
      console.error(`Error getting details for food ${food.name}:`, error);
      return null;
    }
  }

  private async hasNextPage(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      const nextButton = document.querySelector('.next, .pagination-next, [class*="next"]');
      return nextButton && !nextButton.classList.contains('disabled');
    });
  }

  private async goToNextPage(page: Page, pageNumber: number): Promise<void> {
    await page.evaluate((pageNum) => {
      const nextButton = document.querySelector('.next, .pagination-next, [class*="next"]');
      if (nextButton) {
        (nextButton as HTMLElement).click();
      }
    }, pageNumber);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async searchByCategoryName(page: Page, categoryName: string): Promise<TurkompFoodData[]> {
    const foods: TurkompFoodData[] = [];
    
    try {
      console.log(`Searching for category: ${categoryName}`);
      
      // Ana sayfada kal
      const currentUrl = page.url();
      if (!currentUrl.includes('/database')) {
        let goingPageUrl = `${this.baseUrl}/database?type=foods`;
        console.log(`Going to page: ${goingPageUrl}`);
        await page.goto(goingPageUrl, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 
        });
        await this.delay(3000);
      }

      // Arama kutusunu bul ve kategori adını ara
      const searchInput = await page.$('input[type="text"], input[placeholder*="ara"], input[name*="search"], input[id*="search"]');
      if (searchInput) {
        await searchInput.click();
        // Input'u temizle (Ctrl+A + Delete)
        await page.keyboard.down('Control');
        await page.keyboard.press('KeyA');
        await page.keyboard.up('Control');
        await page.keyboard.press('Delete');
        await searchInput.type(categoryName);
        await page.keyboard.press('Enter');
        await this.delay(5000); // Daha uzun bekleme süresi
        
        // Sayfa yüklenene kadar bekle
        await page.waitForSelector('#mydatalist, .food-item, .product-item', { timeout: 10000 }).catch(() => {
          console.log('Food list not found after search');
        });
        
        // Sonuçları al
        const pageFoods = await this.getFoodsFromPage(page, categoryName);
        foods.push(...pageFoods);
        
        console.log(`Found ${pageFoods.length} foods after searching for ${categoryName}`);
      } else {
        console.log(`Search input not found for category ${categoryName}, trying to get all foods from current page`);
        
        // Arama kutusu bulunamazsa mevcut sayfadaki tüm besinleri al
        const pageFoods = await this.getFoodsFromPage(page, categoryName);
        foods.push(...pageFoods);
        
        console.log(`Found ${pageFoods.length} foods from current page for category ${categoryName}`);
      }

      console.log(`Total found ${foods.length} foods for category ${categoryName}`);
      return foods;
    } catch (error) {
      console.error(`Error searching for category ${categoryName}:`, error);
      return foods;
    }
  }

  async saveFoodsToDatabase(foods: TurkompFoodData[]): Promise<void> {
    try {
      if (!this.dataSource || !this.dataSource.isInitialized) {
        throw new Error('DataSource not initialized');
      }
      
      const foodRepository = this.dataSource.getRepository(Food);
      const categoryRepository = this.dataSource.getRepository(FoodCategory);
      const foodItemRepository = this.dataSource.getRepository(FoodItem);

      for (const foodData of foods) {
        try {
          // 1. Kategoriyi bul veya oluştur
          let category = await categoryRepository.findOne({
            where: { name: foodData.category }
          });

          if (!category) {
            category = categoryRepository.create({
              name: foodData.category,
              source: 'turkomp'
            });
            category = await categoryRepository.save(category);
            console.log(`Created new category: ${foodData.category}`);
          }

          // 2. Gıdayı bul veya oluştur
          let existingFood = await foodRepository.findOne({
            where: { turkompId: foodData.turkompId },
            relations: ['foodItems']
          });

          if (existingFood) {
            // Güncelle
            existingFood.name = foodData.name;
            existingFood.nameEn = foodData.nameEn;
            existingFood.categoryId = category.id;
            existingFood.subCategory = foodData.subCategory;
            existingFood.description = foodData.description;
            existingFood.lastUpdated = new Date();
            existingFood.source = 'turkomp';
            
            // Mevcut besin değerlerini sil
            if (existingFood.foodItems && existingFood.foodItems.length > 0) {
              await foodItemRepository.remove(existingFood.foodItems);
            }
            
            existingFood = await foodRepository.save(existingFood);
          } else {
            // Yeni oluştur
            const newFood = foodRepository.create({
              turkompId: foodData.turkompId,
              name: foodData.name,
              nameEn: foodData.nameEn,
              categoryId: category.id,
              subCategory: foodData.subCategory,
              description: foodData.description,
              lastUpdated: new Date(),
              source: 'turkomp'
            });
            existingFood = await foodRepository.save(newFood);
          }

          // 3. Besin değerlerini kaydet
          if (foodData.nutritionalValues && Object.keys(foodData.nutritionalValues).length > 0) {
            const foodItems: Partial<FoodItem>[] = [];
            
            Object.entries(foodData.nutritionalValues).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                const unit = foodData.nutritionalUnits?.[key] || this.getDefaultUnit(key);
                foodItems.push({
                  foodId: existingFood.id,
                  name: this.getNutrientName(key),
                  value: value,
                  unit: unit,
                  order: this.getNutrientOrder(key)
                });
              }
            });

            if (foodItems.length > 0) {
              await foodItemRepository.save(foodItems);
              console.log(`Saved ${foodItems.length} nutritional values for ${foodData.name}`);
            }
          }

        } catch (error) {
          console.error(`Error saving food ${foodData.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  private getDefaultUnit(nutrientKey: string): string {
    const unitMap: { [key: string]: string } = {
      energy: 'kcal',
      protein: 'g',
      carbohydrate: 'g',
      fat: 'g',
      saturatedFat: 'g',
      monounsaturatedFat: 'g',
      polyunsaturatedFat: 'g',
      cholesterol: 'mg',
      fiber: 'g',
      sugar: 'g',
      sodium: 'mg',
      potassium: 'mg',
      calcium: 'mg',
      iron: 'mg',
      zinc: 'mg',
      vitaminA: 'μg',
      vitaminC: 'mg',
      vitaminD: 'μg',
      vitaminE: 'mg',
      thiamine: 'mg',
      riboflavin: 'mg',
      niacin: 'mg',
      vitaminB6: 'mg',
      folate: 'μg',
      vitaminB12: 'μg',
      phosphorus: 'mg',
      magnesium: 'mg',
      selenium: 'μg',
      copper: 'mg',
      manganese: 'mg',
      iodine: 'μg',
      chromium: 'μg',
      molybdenum: 'μg',
      fluoride: 'mg',
      water: 'g',
      ash: 'g'
    };
    return unitMap[nutrientKey] || 'g';
  }

  private getNutrientName(nutrientKey: string): string {
    const nameMap: { [key: string]: string } = {
      energy: 'Enerji',
      protein: 'Protein',
      carbohydrate: 'Karbonhidrat',
      fat: 'Yağ',
      saturatedFat: 'Doymuş Yağ',
      monounsaturatedFat: 'Tekli Doymamış Yağ',
      polyunsaturatedFat: 'Çoklu Doymamış Yağ',
      cholesterol: 'Kolesterol',
      fiber: 'Lif',
      sugar: 'Şeker',
      sodium: 'Sodyum',
      potassium: 'Potasyum',
      calcium: 'Kalsiyum',
      iron: 'Demir',
      zinc: 'Çinko',
      vitaminA: 'A Vitamini',
      vitaminC: 'C Vitamini',
      vitaminD: 'D Vitamini',
      vitaminE: 'E Vitamini',
      thiamine: 'B1 Vitamini (Tiamin)',
      riboflavin: 'B2 Vitamini (Riboflavin)',
      niacin: 'B3 Vitamini (Niasin)',
      vitaminB6: 'B6 Vitamini',
      folate: 'Folat',
      vitaminB12: 'B12 Vitamini',
      phosphorus: 'Fosfor',
      magnesium: 'Magnezyum',
      selenium: 'Selenyum',
      copper: 'Bakır',
      manganese: 'Mangan',
      iodine: 'İyot',
      chromium: 'Krom',
      molybdenum: 'Molibden',
      fluoride: 'Florür',
      water: 'Su',
      ash: 'Kül'
    };
    return nameMap[nutrientKey] || nutrientKey;
  }

  private getNutrientOrder(nutrientKey: string): number {
    const orderMap: { [key: string]: number } = {
      energy: 1,
      protein: 2,
      carbohydrate: 3,
      fat: 4,
      saturatedFat: 5,
      monounsaturatedFat: 6,
      polyunsaturatedFat: 7,
      cholesterol: 8,
      fiber: 9,
      sugar: 10,
      sodium: 11,
      potassium: 12,
      calcium: 13,
      iron: 14,
      zinc: 15,
      vitaminA: 16,
      vitaminC: 17,
      vitaminD: 18,
      vitaminE: 19,
      thiamine: 20,
      riboflavin: 21,
      niacin: 22,
      vitaminB6: 23,
      folate: 24,
      vitaminB12: 25,
      phosphorus: 26,
      magnesium: 27,
      selenium: 28,
      copper: 29,
      manganese: 30,
      iodine: 31,
      chromium: 32,
      molybdenum: 33,
      fluoride: 34,
      water: 35,
      ash: 36
    };
    return orderMap[nutrientKey] || 99;
  }
}
