const io = require('socket.io-client');
const token = process.argv[2] || process.env.TOKEN;
const roomId = process.argv[3] || process.env.ROOM_ID;
const name = process.argv[4] || 'tester';
if (!token || !roomId) { console.error('Missing token or roomId (args or env)'); process.exit(2); }
const client = io('http://localhost:4000', { auth: { token } });
client.on('connect', () => {
  console.log('connected', client.id);
  client.emit('join-room', { roomId }, (ack) => {
    console.log('join ack', JSON.stringify(ack));
    client.emit('send-message', { roomId, content: `Hello from ${name}` }, (ack2) => {
      console.log('send ack', JSON.stringify(ack2));
      client.close();
      process.exit(0);
    });
  });
});
client.on('join-error', (e) => { console.log('join-error', JSON.stringify(e)); client.close(); process.exit(2); });
client.on('message-error', (e) => { console.log('message-error', JSON.stringify(e)); client.close(); process.exit(2); });
client.on('message', (msg) => { console.log('received message', JSON.stringify(msg)); });
client.on('connect_error', (err) => { console.error('connect_error', err.message || err); process.exit(3); });
