const Redis = require('ioredis');
(async function(){
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  const client = new Redis(url);
  try {
    const res = await client.ping();
    console.log('PING ->', res);
    await client.quit();
    process.exit(0);
  } catch (err) {
    console.error('PING error', err && err.message ? err.message : err);
    try { await client.quit(); } catch(e){}
    process.exit(2);
  }
})();
