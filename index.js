var jamServerPort = 22124;
var chatFile = '/tmp/JamChat-'+jamServerPort;
var csvFile = '/tmp/JamulusClients.csv';
const express = require('express')
const app = express()
const server = require('http').createServer(app)
const port = process.env.PORT || 32123
const io = require('socket.io')(server)
const path = require('path')
var fs = require('fs');
var parse = require("csv-parse");
var JamChat=fs.createReadStream(chatFile);
var connectedClients = {};
const dgram = require('dgram');
const udp_socket = dgram.createSocket('udp4');
const CRC = require('./CRC.js')

server.listen(port, () => {
  console.log(`Server running on port: ${port}`)
})

app.use(express.static(path.join(__dirname + '/public')))

io.on('connection', socket => {
    fs.createReadStream(csvFile).pipe(parse({ delimiter: ';' }, processData));
    socket.on('chat', (user, message) => {
        if (socket.id in connectedClients === true) {
            createAndSendBuffer(user, message)
        } else {
            socket.emit('resetUsersView')
            registerUser(socket, user)
            createAndSendBuffer(user, message)
        }
    })
    socket.on("disconnecting", () => {
        if (connectedClients[socket.id] != undefined ) {
            io.emit('userDisconnected', connectedClients[socket.id][0])
            delete connectedClients[socket.id]
        }
        });
    })

JamChat.on('data', data => {
        io.emit('chat', data.toString('latin1'))
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


const processData = (err, data) => {
    if (err) {
        console.log(`An error was encountered: ${err}`);
        return;
    }
    data.shift(); // only required if csv has heading row
    const userList = data.map(row => new User(...row));
    result = '<tr><th>name</th><th>instrument</th><th>city</th><th>country</th><th>skill</th></tr>';
    userList.forEach( function(user) {
        result += '<tr>';
        result += '<td>'+ user.name +'</td>';
        result += '<td>'+ user.instrument +'</td>';
        result += '<td>'+ user.city +'</td>';
        result += '<td>'+ user.country +'</td>';
        result += '<td>'+ user.skill +'</td>';
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
    const BufferMaker = require('buffermaker')
    message = '<b>***Message from listener ' + user + ':</b> ' + message;
    message = Buffer.from(message, 'utf8')
    var id = 1019; // external chat message jamulus protocol id
    var messageBuffer = new BufferMaker()
                        .UInt16LE(0x0000)
                        .UInt16LE(id)
                        .UInt8(0)
                        .UInt16LE(message.length + 2)
                        .UInt16LE(message.length)
                        .string(message)
                        .make();
    crc = new CRC(messageBuffer.toString('latin1'))
    crcvalue = new BufferMaker()
                        .UInt16LE(crc.Get())
                        .make()

    messageBuffer = Buffer.concat( [messageBuffer, crcvalue] )

    udp_socket.send(messageBuffer, jamServerPort, 'localhost');
}

fs.watchFile(csvFile, ()=> {
    fs.createReadStream(csvFile).pipe(parse({ delimiter: ';' }, processData));
});
