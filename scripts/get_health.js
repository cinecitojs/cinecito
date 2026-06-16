(async () => {
  try {
    const res = await fetch('http://localhost:4000/health');
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('fetch error', err && err.message ? err.message : err);
    process.exit(2);
  }
})();
