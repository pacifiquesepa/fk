const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'fkams-live-qr-clean' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  },
});

client.on('qr', (qr) => {
  console.log('--- QR CODE START ---');
  qrcode.generate(qr, { small: true });
  console.log('--- QR CODE END ---');
  console.log('Scan this QR in WhatsApp on your phone to pair the live session.');
});

client.on('ready', () => {
  console.log('WHATSAPP_READY');
  client.sendMessage('250000000000@c.us', 'FKAMS live test message: WhatsApp pairing successful.').then(() => {
    console.log('LIVE_TEST_MESSAGE_SENT');
    process.exit(0);
  }).catch((err) => {
    console.error('LIVE_TEST_MESSAGE_FAILED', err && err.message ? err.message : err);
    process.exit(1);
  });
});

client.on('auth_failure', (err) => {
  console.error('AUTH_FAILED', err && err.message ? err.message : err);
  process.exit(1);
});

client.on('disconnected', () => {
  console.log('WHATSAPP_DISCONNECTED');
});

client.initialize().catch((err) => {
  console.error('INIT_FAILED', err && err.message ? err.message : err);
  process.exit(1);
});
