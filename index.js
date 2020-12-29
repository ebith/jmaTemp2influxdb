const { chromium } = require('playwright-chromium');
const influx = new (require('influx').InfluxDB)('http://localhost:8086/homestats');

const url = 'https://www.jma.go.jp/jp/amedas_h/today-64036.html?areaCode=000&groupCode=47';

(async () => {
  const browser = await chromium.launch({executablePath: '/usr/bin/chromium'});
  const page = await browser.newPage();
  await page.goto(url);
  const result = await page.evaluate(() => {
    const today = new Date();
    const tdLength = document.querySelector('table#tbl_list tr').querySelectorAll('td').length;
    for (const tr of document.querySelector('table#tbl_list').querySelectorAll('tr')) {
      const hour = tr.querySelector('td:nth-child(1)').textContent - 0;
      if (hour === today.getHours() || (hour === 24 && today.getHours() === 0)) {
        const temperature = tr.querySelector('td:nth-child(2)').textContent - 0;
        const humidity = tr.querySelector(`td:nth-child(${tdLength - 1})`).textContent - 0;
        const pressure = tr.querySelector(`td:nth-child(${tdLength})`).textContent - 0;
	return [{temperature}, {humidity}, {pressure}];
      }
    }
  });
  await browser.close();
  const fields = result.filter((value) => {
    return !Number.isNaN(Object.values(value)[0]);
  }).reduce((acc, cur) => {
     const key = Object.keys(cur);
     acc[key] = cur[key];
     return acc;
  });
  const today = new Date();
  today.setHours(today.getHours(), 0, 0);
  const points = [
    {
      measurement: 'jma',
      tags: {
        location: 'nara',
      },
      fields,
      timestamp: today,
    },
  ];
  influx.writePoints(points).catch((error) => console.error(error));
})();
