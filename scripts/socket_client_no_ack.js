const io = require('socket.io-client');
const token = process.argv[2] || process.env.TOKEN;
const roomId = process.argv[3] || process.env.ROOM_ID;
if (!token || !roomId) { console.error('Missing token or roomId (args or env)'); process.exit(2); }
const client = io('http://localhost:4000', { auth: { token } });
client.on('connect', () => {
  console.log('connected', client.id);
  client.emit('join-room', { roomId });
  setTimeout(() => {
    console.log('sending message via socket (no ack)');
    client.emit('send-message', { roomId, content: 'Hello no-ack' });
  }, 500);
});
client.on('message', (msg) => { console.log('received message', JSON.stringify(msg, null, 2)); client.close(); process.exit(0); });
client.on('join-error', (e) => { console.log('join-error', JSON.stringify(e)); client.close(); process.exit(2); });
client.on('message-error', (e) => { console.log('message-error', JSON.stringify(e)); client.close(); process.exit(2); });
client.on('connect_error', (err) => { console.error('connect_error', err.message || err); process.exit(3); });
