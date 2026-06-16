const url = process.argv[2] || 'http://localhost:4000';
const token = process.argv[3];
const name = process.argv[4] || 'Test Room';
const isPrivate = process.argv[5] === 'true';
if (!token) { console.error('usage: node create_room.js <url> <token> <name> <isPrivate>'); process.exit(2); }
(async () => {
  try {
    const res = await fetch(`${url}/rooms`, { method: 'POST', headers: { 'content-type': 'application/json', 'authorization': `Bearer ${token}` }, body: JSON.stringify({ name, isPrivate }) });
    const json = await res.json();
    console.log(JSON.stringify(json, null, 2));
  } catch (err) {
    console.error('error', err && err.message ? err.message : err);
    process.exit(3);
  }
})();
