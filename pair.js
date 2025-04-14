const express = require('express');
const fs = require('fs');
const { exec } = require("child_process");
let router = express.Router();
const pino = require("pino");
const os = require('os');
const axios = require('axios'); // Add axios for downloading the audio file
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers,
    jidNormalizedUser
} = require("@whiskeysockets/baileys");
const { upload } = require('./mega');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

// Function to format runtime
function runtime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
}

// Function to download file from URL
async function downloadFile(url, outputPath) {
    const writer = fs.createWriteStream(outputPath);
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream'
    });
    response.data.pipe(writer);
    
    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}

// Function to send image, system info, and audio
async function sendSystemInfoWithMedia(PrabathPairWeb, user_jid) {
    const runtimeInfo = runtime(process.uptime());
    const usedRam = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    const totalRam = Math.round(os.totalmem() / 1024 / 1024);

    const message = `𝗦𝗘𝗡𝗨_𝗠𝗗_𝗩3_𝗖𝗢𝗡𝗡𝗘𝗖𝗧𝗘𝗗 ✅

╔⦁❮⦁══════════════⦁❯⦁╗
          ᴡʜᴀᴛꜱᴀᴘᴘ ᴄʜᴀɴɴᴇʟ | 
https://whatsapp.com/channel/0029VayrakE35fM0fqnszD3c
╚⦁❮⦁══════════════⦁❯⦁╝

╔⦁❮⦁═════════════⦁❯⦁╗
🪀ᴄᴏɴᴛᴀᴄᴛ | +94788770020
╚⦁❮⦁═════════════⦁❯⦁╝

╔⦁❮⦁════════════⦁❯⦁╗
> ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴊᴇꜱᴛᴇʀ-ᴇxᴇ
╚⦁❮⦁════════════⦁❯⦁╝`;

    const imageUrl = 'https://i.ibb.co/9k6s44Zb/625.jpg';
    const audioUrl = 'https://github.com/Cocdas/dizerpair/raw/refs/heads/main/kongga.mp3';
    const audioPath = './kongga.mp3';

    try {
        // Download the audio file if it doesn't exist
        if (!fs.existsSync(audioPath)) {
            await downloadFile(audioUrl, audioPath);
        }

        // Send the image with caption
        await PrabathPairWeb.sendMessage(user_jid, {
            image: { url: imageUrl },
            caption: message
        });

        // Read the audio file and send as voice message
        const audioData = fs.readFileSync(audioPath);
        await PrabathPairWeb.sendMessage(user_jid, {
            audio: audioData,
            mimetype: 'audio/ogg; codecs=opus',
            ptt: true  // This makes it a voice message
        });

    } catch (error) {
        console.error("Error sending media:", error);
        // Fallback to just sending text if media fails
        await PrabathPairWeb.sendMessage(user_jid, { text: message });
    }
}

router.get('/', async (req, res) => {
    let num = req.query.number;
    async function PrabathPair() {
        const { state, saveCreds } = await useMultiFileAuthState(`./session`);
        try {
            let PrabathPairWeb = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
            });

            if (!PrabathPairWeb.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await PrabathPairWeb.requestPairingCode(num);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            PrabathPairWeb.ev.on('creds.update', saveCreds);
            PrabathPairWeb.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;
                if (connection === "open") {
                    try {
                        await delay(10000);

                        const auth_path = './session/';
                        const user_jid = jidNormalizedUser(PrabathPairWeb.user.id);

                        const mega_url = await upload(fs.createReadStream(auth_path + 'creds.json'), `${user_jid}.json`);
                        const string_session = mega_url.replace('https://mega.nz/file/', '');

                        // Send the string session
                        await PrabathPairWeb.sendMessage(user_jid, { text: string_session });

                        // Send the image, system info, and audio
                        await sendSystemInfoWithMedia(PrabathPairWeb, user_jid);

                    } catch (e) {
                        exec('pm2 restart dizer');
                    }

                    await delay(100);
                    return await removeFile('./session');
                    process.exit(0);
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode !== 401) {
                    await delay(10000);
                    PrabathPair();
                }
            });
        } catch (err) {
            exec('pm2 restart prabath-md');
            console.log("service restarted");
            PrabathPair();
            await removeFile('./session');
            if (!res.headersSent) {
                await res.send({ code: "Service Unavailable" });
            }
        }
    }
    return await PrabathPair();
});

process.on('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    exec('pm2 restart dizer');
});

module.exports = router;
