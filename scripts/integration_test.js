(async () => {
  try {
    const base = 'http://localhost:4000';
    const ts = Date.now();
    const email = `itest+${ts}@example.com`;
    const username = `itest_${ts}`;
    const password = 'Pass1234!';

    console.log('register ->', { email, username });
    const regRes = await fetch(`${base}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });
    const regJson = await regRes.json();
    console.log('register res', JSON.stringify(regJson, null, 2));

    const token = regJson.token;
    const userId = regJson.user?.id;

    console.log('me ->');
    const meRes = await fetch(`${base}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    console.log('me res', await meRes.json());

    console.log('create room ->');
    const createRes = await fetch(`${base}/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({ name: 'Integration Test Room', isPrivate: false }),
    });
    const roomJson = await createRes.json();
    console.log('create room res', JSON.stringify(roomJson, null, 2));

    console.log('join room ->');
    const joinRes = await fetch(`${base}/rooms/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: roomJson.code, displayName: 'Tester' }),
    });
    const joinJson = await joinRes.json();
    console.log('join room res', JSON.stringify(joinJson, null, 2));

    console.log('post message ->');
    const msgRes = await fetch(`${base}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ roomId: roomJson.id, content: 'Hello from integration test' }),
    });
    const msgJson = await msgRes.json();
    console.log('post message res', JSON.stringify(msgJson, null, 2));

    console.log('list messages ->');
    const listRes = await fetch(`${base}/messages?roomId=${roomJson.id}`);
    const listJson = await listRes.json();
    console.log('list messages res', JSON.stringify(listJson, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('ERROR', err);
    process.exit(1);
  }
})();
