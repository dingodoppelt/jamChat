import jamulusRpcInterface from './jamulusrpcclient/RPCmodule.mjs';
import express from 'express';
import * as http from 'http';
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Konfiguration über Umgebungsvariablen oder Default-Werte
let port = process.env.JAMCHATPORT || 32123;
let secret = process.env.JSONRPCSECRETFILE || '/var/opt/jamulusRPCsecret.txt';
let rpcPort = process.env.JSONRPCPORT || 8765;
let streamUrl = process.env.STREAMURL;

// Argument-Parsing (CLI)
process.argv.slice(2).forEach((val) => {
    const parts = val.split('=');
    switch (parts[0]) {
        case 'jamChatHttpPort': port = parts[1]; break;
        case 'jamulusRPCSecretFilePath': secret = parts[1]; break;
        case 'jamRPCPort': rpcPort = parts[1]; break;
        case 'jamStreamLink': streamUrl = parts[1]; break;
    }
});

const RPC = new jamulusRpcInterface(rpcPort, secret);
const connectedClients = {};
let rpcBuffer = ''; // Puffer für fragmentierte TCP-Pakete

app.use(express.static('./public'));

// --- ROBUSTER RPC DATA HANDLER ---
RPC.jamRPCServer.on('data', (data) => {
    rpcBuffer += data.toString();
    let lines = rpcBuffer.split('\n');
    
    // Das letzte Element ist entweder leer (bei \n am Ende) oder ein unvollständiges JSON
    rpcBuffer = lines.pop(); 

    for (const row of lines) {
        if (!row.trim()) continue;

        try {
            const parsed = JSON.parse(row);

            // Spezialfall: Antwort auf getClientDetails
            if (parsed.id === 'getInfo' && parsed.result) {
                processData(parsed.result.clients);
                continue;
            }

            // Notifications verarbeiten
            switch (parsed.method) {
                case 'jamulusserver/chatMessageReceived':
                    io.emit('chat', parsed.params.chatMessage);
                    break;
                case 'jamulusserver/clientConnected':
                case 'jamulusserver/clientDisconnected':
                    // Kurze Verzögerung, damit Jamulus den internen Status aktualisieren kann
                    setTimeout(() => {
                        sendRpcRequest("jamulusserver/getClients", {}, "getInfo");
                    }, 500);
                    break;
            }
        } catch (e) {
            console.error("RPC Parse Error:", e.message, "Row:", row);
        }
    }
});

// Fehlerbehandlung für den Socket
RPC.jamRPCServer.on('error', (err) => {
    console.error("RPC Socket Error:", err.message);
});

// --- SOCKET.IO LOGIK ---
io.on('connection', socket => {
    socket.on('chat', (user, message) => {
        if (connectedClients[socket.id]) {
            // HTML-Injection im Chat verhindern (einfaches Escaping)
            const cleanMsg = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            broadcastToJamulus(user, cleanMsg);
        } else {
            sendRpcRequest("jamulusserver/getClients", {}, "getInfo");
            socket.emit('resetUsersView');
            registerUser(socket, user);
        }
    });

    socket.on("disconnecting", () => {
        if (connectedClients[socket.id]) {
            io.emit('userDisconnected', connectedClients[socket.id][0]);
            delete connectedClients[socket.id];
        }
    });
});

// --- HILFSFUNKTIONEN ---

/**
 * Sendet eine sicher formatierte RPC-Anfrage
 */
function sendRpcRequest(method, params = {}, requestId = "node_req") {
    const payload = JSON.stringify({
        id: requestId,
        jsonrpc: "2.0",
        method: method,
        params: params
    }) + "\n";
    RPC.jamRPCServer.write(payload);
}

/**
 * Sendet eine Chat-Nachricht an den Jamulus Server (Sicher gegen Injection)
 */
function broadcastToJamulus(user, message) {
    const formattedMsg = `<b>***Message from listener ${user}:</b> ${message}`;
    sendRpcRequest("jamulusserver/broadcastChatMessage", { chatMessage: formattedMsg }, "chat");
}

const processData = (clients) => {
    let result = '<tr><th>name</th><th>instrument</th><th>city</th><th>country</th><th>skill</th></tr>';
    clients.forEach(el => {
        result += `<tr><td>${el.name}</td><td>${INSTRUMENTS.get(el.instrumentCode, "Unknown Instrument")}</td><td>${el.city}</td><td>${el.countryName}</td><td>${SKILL_LEVELS.get(el.skillLevelCode, "")}</td></tr>`;
    });
    io.emit('users', result);
}

const registerUser = (socket, userName) => {
    socket.emit('resetUsersView');
    io.emit('userConnected', userName);
    
    // Bestehende User an den neuen Client senden
    for (const [id, data] of Object.entries(connectedClients)) {
        socket.emit('userConnected', data[0]);
    }
    
    connectedClients[socket.id] = [userName, socket.client.conn.remoteAddress];
}

app.get('/config', (req, res) => {
    res.json({ streamUrl });
});

server.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});

INSTRUMENTS = {
    0: "None", 1: "Drum Set", 2: "Djembe", 3: "Electric Guitar",
    4: "Acoustic Guitar", 5: "Bass Guitar", 6: "Keyboard", 7: "Synthesizer",
    8: "Grand Piano", 9: "Accordion", 10: "Vocal", 11: "Microphone",
    12: "Harmonica", 13: "Trumpet", 14: "Trombone", 15: "French Horn",
    16: "Tuba", 17: "Saxophone", 18: "Clarinet", 19: "Flute",
    20: "Violin", 21: "Cello", 22: "Double Bass", 23: "Recorder",
    24: "Streamer", 25: "Listener", 26: "Guitar+Vocal", 27: "Keyboard+Vocal",
    28: "Bodhran", 29: "Bassoon", 30: "Oboe", 31: "Harp",
    32: "Viola", 33: "Congas", 34: "Bongo", 35: "Vocal Bass",
    36: "Vocal Tenor", 37: "Vocal Alto", 38: "Vocal Soprano", 39: "Banjo",
    40: "Mandolin", 41: "Ukulele", 42: "Bass Ukulele", 43: "Vocal Baritone",
    44: "Vocal Lead", 45: "Mountain Dulcimer", 46: "Scratching", 47: "Rapping",
    48: "Vibraphone", 49: "Conductor"
}

SKILL_LEVELS = {
    0: "none",
    1: "Beginner",
    2: "Intermediate",
    3: "Expert"
}
