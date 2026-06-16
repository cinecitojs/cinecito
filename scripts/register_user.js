const url = process.argv[2] || 'http://localhost:4000';
const email = process.argv[3];
const username = process.argv[4];
const password = process.argv[5] || 'password';
if (!email || !username) { console.error('usage: node register_user.js <url> <email> <username> [password]'); process.exit(2); }
(async () => {
  try {
    const res = await fetch(`${url}/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, username, password }) });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('error', err && err.message ? err.message : err);
    process.exit(3);
  }
})();
