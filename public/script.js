const socket = io()
const chat = document.querySelector('.chat-form')
const Input = document.querySelector('.chat-input')
const chatWindow = document.querySelector('.chat-window')
const activeUsers = document.querySelector('.active_users')
const userName = document.getElementById('name')
const usersTable = document.querySelector('.usersTable')

function PlaySound() {
  var sound = new Audio("sounds/new_message.wav");
  sound.play();
}

socket.emit('chat', userName.value, '...connected');
socket.emit('clientInfo', userName.value);

chat.addEventListener('submit', event => {
  event.preventDefault()
  if ( Input.value != '' ) {
      socket.emit('chat', userName.value, Input.value )
      Input.value = ''
  }
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
