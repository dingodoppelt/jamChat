const socket = io()
const chat = document.querySelector('.chat-form')
const Input = document.querySelector('.chat-input')
const chatWindow = document.querySelector('.chat-window')
const userName = document.getElementById('name')
const usersTable = document.querySelector('.usersTable')

socket.emit('chat', userName.value, '...connected');

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

const renderMessage = message => {
  const div = document.createElement('div')
  div.classList.add('render-message')
  div.innerHTML = message
  chatWindow.appendChild(div)
  chatWindow.scrollTop = chatWindow.scrollHeight;
}
