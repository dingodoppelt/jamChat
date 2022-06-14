const socket = io()
const chat = document.querySelector('.chat-form')
const Input = document.querySelector('.chat-input')
const chatWindow = document.querySelector('.chat-window')
const activeUsers = document.querySelector('.active_users')
const userName = document.getElementById('name')
const usersTable = document.querySelector('.usersTable')
const streamLink = document.getElementById('linktostream')

function PlaySound() {
  var sound = new Audio("sounds/new_message.wav");
  sound.play();
}

chat.addEventListener('submit', event => {
  event.preventDefault()
  if ( Input.value != '' ) {
      socket.emit('chat', userName.value, Input.value )
      Input.value = ''
  }
})

socket.io.on('reconnect', () => {
    socket.emit('chat', userName.value, '...reconnected');
})

socket.on('chat', message => {
    renderMessage(message)
})

socket.on('users', table => {
    document.getElementById('usersTable').innerHTML = table
})

socket.on('userConnected', userName => {
    showUser(userName)
})

socket.on('userDisconnected', userName => {
    document.querySelector(`.${userName}-userlist`).remove();
});

socket.on('resetUsersView', () => {
    activeUsers.innerHTML = ''
});

const renderMessage = message => {
  const div = document.createElement('div')
  div.classList.add('render-message')
  div.innerHTML = message
  chatWindow.appendChild(div)
  if (document.getElementById("audiocue").checked) { PlaySound() }
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

const showUser = user => {
  const div = document.createElement('div')
  div.classList.add(`${user}-userlist`)
  div.innerHTML = user
  activeUsers.appendChild(div)
}

if (typeof streamOgg !== 'undefined' || typeof streamMp3 !== 'undefined') {
    let streamHtml = '<audio controls preload="none">';
    if (typeof streamOgg !== 'undefined') streamHtml += '<source src="'+ streamOgg +'" type="audio/ogg">';
    if (typeof streamMp3 !== 'undefined') streamHtml += '<source src="'+ streamMp3 +'" type="audio/mp3">';
    streamHtml += 'Your browser does not support the audio tag</audio>'
    streamLink.innerHTML = streamHtml;
}
socket.emit('chat', userName.value, '...connected');
