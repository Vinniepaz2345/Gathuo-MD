const express = require('express');
const fs = require('fs');
const path = require('path');
const { default: makeWASocket, useSingleFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

const app = express();
app.use(express.static('public'));
app.use(express.json());

const sessionsDir = './sessions';
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir);

app.post('/generate', async (req, res) => {
  const { phone } = req.body;
  const sessionId = `session-${Date.now()}`;
  const authPath = `${sessionsDir}/${sessionId}.json`;
  const { state, saveState } = useSingleFileAuthState(authPath);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false,
    phoneNumber: phone,
    browser: ['Render Bot', 'Chrome', '120.0.0.0']
  });

  let pairingCode = '';

  sock.ev.on('creds.update', saveState);

  sock.ev.on('connection.update', async (update) => {
    const { connection, pairingCode: code } = update;

    if (code) pairingCode = code;

    if (connection === 'open') {
      console.log('Connected!');
      await sock.sendMessage(`${phone}@s.whatsapp.net`, {
        text: `Your bot session ID is:\n${sessionId}`
      });
    }
  });

  setTimeout(() => {
    if (pairingCode) {
      res.json({ sessionId, pairingCode });
    } else {
      res.status(500).json({ error: 'Failed to generate pairing code' });
    }
  }, 3000);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
