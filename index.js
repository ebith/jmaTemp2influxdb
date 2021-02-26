const got = require('got');
const influx = new (require('influx').InfluxDB)('http://localhost:8086/homestats');

(async () => {
  const zp = (n) => {
    return ('0' + n).slice(-2);
  };
  const now = new Date();
  const hours = (now) => {
    const range = [0, 3, 6, 9, 12, 15, 18, 21];
    let hours = now.getHours();
    while (!range.includes(hours)) {
      hours--;
    }
    return hours;
  };

  const url = `https://www.jma.go.jp/bosai/amedas/data/point/64036/${now.getFullYear()}${zp(now.getMonth() + 1)}${zp(now.getDate())}_${zp(hours(now))}.json`;
  const { body } = await got(url, {
    responseType: 'json',
  });

  const keys = Object.keys(body).sort((a, b) => {
    return b - a;
  });
  const data = body[keys[0]];
  const fields = {
    temperature: data.temp[0],
    humidity: data.humidity[0],
    pressure: data.pressure[0],
  };

  now.setHours(keys[0].slice(-6, -4), keys[0].slice(-4, -2), 0);
  const points = [
    {
      measurement: 'jma',
      tags: {
        location: 'nara',
      },
      fields,
      timestamp: now,
    },
  ];
  influx.writePoints(points).catch((error) => console.error(error));
})();
