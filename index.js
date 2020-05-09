const { chromium } = require('playwright-chromium');
const influx = new (require('influx').InfluxDB)('http://localhost:8086/homestats');

const url = 'https://www.jma.go.jp/jp/amedas_h/today-64036.html?areaCode=000&groupCode=47';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);
  const temperature = await page.evaluate(() => {
    const today = new Date();
    for (const tr of document.querySelector('table#tbl_list').querySelectorAll('tr')) {
      const hour = tr.querySelector('td:nth-child(1)').textContent - 0;
      if (hour === today.getHours() || (hour === 24 && today.getHours() === 0)) {
        const temperature = tr.querySelector('td:nth-child(2)').textContent - 0;
        if (!Number.isNaN(temperature)) {
          return temperature;
        }
      }
    }
  });
  await browser.close();
  if (temperature) {
    const today = new Date();
    today.setHours(today.getHours(), 0, 0);
    const points = [
      {
        measurement: 'jma',
        tags: {
          location: 'nara',
        },
        fields: {
          temperature,
        },
        timestamp: today,
      },
    ];
    influx.writePoints(points).catch((error) => console.error(error));
  }
})();