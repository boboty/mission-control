const puppeteer = require('puppeteer');

async function main() {
  try {
    console.log('Launching browser...');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for content to load
    await page.waitForSelector('.card, [class*="card"]', { timeout: 10000 }).catch(() => {
      console.log('Warning: Card selector not found, continuing anyway');
    });
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Taking screenshot...');
    await page.screenshot({ 
      path: '/home/pve/.openclaw/workspace/files/mission-control-homepage.png',
      fullPage: true,
      type: 'png'
    });
    
    console.log('Screenshot saved to /home/pve/.openclaw/workspace/files/mission-control-homepage.png');
    
    await browser.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
