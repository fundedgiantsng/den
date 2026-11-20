const https = require('https');

https.get('https://www.ninja.ng/docs/', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const urls = new Set();
    const regex = /https:\/\/[a-zA-Z0-9.-]+(?:boucloud\.io|ninja\.ng)[^\s"'<>]*/g;
    let m;
    while ((m = regex.exec(data)) !== null) {
      urls.add(m[0]);
    }
    console.log('Found endpoints in docs:');
    for (const u of urls) {
      if (u.includes('api') || u.includes('sandbox') || u.includes('auth')) {
        console.log(u);
      }
    }
  });
});
