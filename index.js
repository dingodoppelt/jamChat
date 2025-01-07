import jamulusRpcInterface from './jamulusrpcclient/RPCmodule.mjs';
import express from 'express';
import * as http from 'http';
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
let port = 32123;
let secret = process.env.JSONRPCSECRETFILE || 'jamulusRPCSecret.txt';
let rpcPort = process.env.JSONRPCPORT || 8765;
let streamUrl = process.env.STREAMURL;
process.argv.slice(2).forEach((val) => {
    val = val.split('=')
    switch (val[0]) {
        case 'jamChatHttpPort':
            port = val[1];
            break;
        case 'jamulusRPCSecretFilePath':
            secret = val[1];
            break;
        case 'jamRPCPort':
            rpcPort = val[1];
            break;
        case 'jamStreamLink':
            streamUrl = val[1];
            break;
        default:
            break;
    }
});
const RPC = new jamulusRpcInterface(rpcPort, secret);
var connectedClients = {};
let partJson = '';

app.use(express.static('./public'))

RPC.jamRPCServer.on('data', (data) => {
    data = data.toString().split('\n');
    for (const row of data) {
        let parsed = {};
        if (row && !row.error) {
            try {
                parsed = JSON.parse(row);
            } catch (e) {
                if (e instanceof SyntaxError) {
                    if (e.message.split(' ')[1] == 'end') {
                        console.log(`${e.name}: ${e.message}`);
                        partJson = row;
                        continue;
                    }
                    else if (e.message.split(' ')[1] == 'token') {
                        console.log(`${e.name}: ${e.message}`);
                        partJson += row;
                        try {
                            parsed = JSON.parse(partJson);
                            partJson = '';
                            console.log('successfully parsed')
                        } catch (e) {
                            continue;
                        }
                    }
                }
            }
            if (parsed.id && parsed.id == 'getInfo' && parsed.result) {
                processData(parsed.result.clients);
                continue;
            }
            switch (parsed.method) {
                case 'jamulusserver/chatMessageReceived':
                    io.emit('chat', parsed.params.chatMessage)
                    break;
                case 'jamulusserver/clientConnected':
                    setTimeout(function() {
                        RPC.jamRPCServer.write('{"id":"getInfo","jsonrpc":"2.0","method":"jamulusserver/getClientDetails","params":{}}\n');
                    }, 500);
                    break;
                case 'jamulusserver/clientDisconnected':
                    setTimeout(function() {
                        RPC.jamRPCServer.write('{"id":"getInfo","jsonrpc":"2.0","method":"jamulusserver/getClientDetails","params":{}}\n');
                    }, 500);
                    break;
                default:
                    break;
            }
        }
    }
});

io.on('connection', socket => {
    socket.on('chat', (user, message) => {
        if (socket.id in connectedClients === true) {
            createAndSendBuffer(user, message.replace(/"/g,'\''))
        } else {
            RPC.jamRPCServer.write('{"id":"getInfo","jsonrpc":"2.0","method":"jamulusserver/getClientDetails","params":{}}\n');
            socket.emit('resetUsersView')
            registerUser(socket, user)
        }
    })
    socket.on("disconnecting", () => {
        if (connectedClients[socket.id] != undefined ) {
            io.emit('userDisconnected', connectedClients[socket.id][0])
            delete connectedClients[socket.id]
        }
    })
})

class User {
  constructor(name, ip, city, country, instrument, instrumentPicture, skill) {
    this.name = name;
    this.ip = ip;
    this.city = city;
    this.country = country;
    this.instrument = instrument;
    this.instrumentPicture = instrumentPicture;
    this.skill = skill;
  }
}


const processData = (data) => {
    let result = '<tr><th>name</th><th>instrument</th><th>city</th><th>country</th><th>skill</th></tr>';
    data.forEach( element => {
        result += '<tr>';
        result += '<td>'+ element.name +'</td>';
        result += '<td>'+ element.instr +'</td>';
        result += '<td>'+ element.city +'</td>';
        result += '<td>'+ element.country +'</td>';
        result += '<td>'+ element.skill +'</td>';
        result += '</tr>';
    });
    io.emit('users', result);
}

const registerUser = (socket, userName) => {
    socket.emit('resetUsersView')
    io.emit('userConnected', userName)
    for (const [id, [name, ip]] of Object.entries(connectedClients)) {
        socket.emit('userConnected', name);
    }
    connectedClients[socket.id] = [ userName, socket.client.conn.remoteAddress ]
//     console.log(connectedClients);
}

const createAndSendBuffer = (user, message) => {
    message = '<b>***Message from listener ' + user + ':</b> ' + message;
    RPC.jamRPCServer.write('{"id":"chat","jsonrpc":"2.0","method":"jamulusserver/broadcastChatMessage","params":{"chatMessage":"' + message + '"}}\n');
}

app.get('/config', (req, res) => {
    res.json({ streamUrl });
});

server.listen(port, () => {
  console.log(`Server running on port: ${port}`)
});
