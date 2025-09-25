const { TurkompCrawlerService } = require('./dist/services/turkomp-crawler.service');

async function testCrawler() {
  console.log('🚀 Starting crawler test...');
  
  const crawler = new TurkompCrawlerService({
    get: (key, defaultValue) => {
      const env = {
        'DB_HOST': 'localhost',
        'DB_PORT': 5432,
        'DB_USERNAME': 'postgres',
        'DB_PASSWORD': '',
        'DB_NAME': 'dieticianapp',
        'NODE_ENV': 'development'
      };
      return env[key] || defaultValue;
    }
  });

  try {
    console.log('📡 Initializing crawler...');
    await crawler.initialize();
    
    console.log('🕷️ Starting to crawl foods...');
    const foods = await crawler.crawlAllFoods();
    
    console.log(`✅ Successfully crawled ${foods.length} foods!`);
    
    if (foods.length > 0) {
      console.log('\n📝 Sample foods:');
      foods.slice(0, 5).forEach((food, index) => {
        console.log(`  ${index + 1}. ${food.name} (${food.category})`);
        if (food.subCategory) {
          console.log(`     Subcategories: ${food.subCategory}`);
        }
        if (Object.keys(food.nutritionalValues).length > 0) {
          console.log(`     Nutritional values: ${Object.keys(food.nutritionalValues).length} found`);
        }
      });
      
      console.log('\n💾 Saving to database...');
      await crawler.saveFoodsToDatabase(foods);
      console.log('✅ Foods saved to database successfully!');
    } else {
      console.log('⚠️ No foods found to save');
    }
    
  } catch (error) {
    console.error('❌ Crawler test failed:', error);
  } finally {
    console.log('🔒 Closing crawler...');
    await crawler.close();
    console.log('✅ Test completed!');
  }
}

testCrawler();
