const express = require('express')
const app = express()
const server = require('http').createServer(app)
const port = process.env.PORT || 32123
const io = require('socket.io')(server)
const path = require('path')
const { spawn } = require('child_process')
var fs = require('fs');
var parse = require("csv-parse");
var JamChat=fs.createReadStream('/tmp/JamChat');
var csvFile = '/tmp/JamulusClients.csv';

server.listen(port, () => {
  console.log(`Server running on port: ${port}`)
})

app.use(express.static(path.join(__dirname + '/public')))

io.on('connection', socket => {
    fs.createReadStream(csvFile).pipe(parse({ delimiter: ';' }, processData));
    socket.on('chat', (user, message) => {
    const php = spawn('php', ['sendChat.php', user, message])
    //console.log('From client: ', message)
  })
})

JamChat.on('data', data => {
        //console.log(str.toString());
        io.emit('chat', data.toString())
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

fs.watchFile(csvFile, ()=> {
    fs.createReadStream(csvFile).pipe(parse({ delimiter: ';' }, processData));
});
