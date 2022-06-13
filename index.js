import jamulusRpcInterface from './RPCmodule.mjs';
import * as fs from 'fs';
import express from 'express';
import * as http from 'http';
import { Server } from "socket.io";

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 32123
const RPC = new jamulusRpcInterface(8765, 'jamulusRPCsecret.txt');
var connectedClients = {};
app.use(express.static('./public'))

RPC.jamRPCServer.on('data', (data) => {
    data = data.toString().split('\n');
    data.forEach( (row) => {
        if (row != '') {
            let parsed = JSON.parse(row);
//             console.log(row);
            switch (parsed.method) {
                case 'jamulusserver/chatMessageReceived':
                    io.emit('chat', parsed.params.chatMessage)
                    break;
                case 'jamulusserver/clientConnected':
                    RPC.jamRPCServer.write('{"id":"getInfo","jsonrpc":"2.0","method":"jamulusserver/getCompleteClientInfo","params":{}}\n');
                    break;
                case 'jamulusserver/clientDisconnected':
                    RPC.jamRPCServer.write('{"id":"getInfo","jsonrpc":"2.0","method":"jamulusserver/getCompleteClientInfo","params":{}}\n');
                    break;
                default:
                    if (parsed.result.clients != undefined) {
                        processData(parsed.result.clients);
                    }
                    break;
            }
        }
    })
});

io.on('connection', socket => {
    socket.on('chat', (user, message) => {
        if (socket.id in connectedClients === true) {
            createAndSendBuffer(user, message)
        } else {
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
    console.log(connectedClients);
}

const createAndSendBuffer = (user, message) => {
    message = '<b>***Message from listener ' + user + ':</b> ' + message;
    RPC.jamRPCServer.write('{"id":"chat","jsonrpc":"2.0","method":"jamulusserver/broadcastChatMessage","params":{"chatMessage":"' + message + '"}}\n');
}

server.listen(port, () => {
  console.log(`Server running on port: ${port}`)
});
