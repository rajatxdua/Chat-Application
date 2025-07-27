import './style.css'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3001')

// DOM elements
const loginForm = document.getElementById('loginForm')
const chatApp = document.getElementById('chatApp')
const usernameInput = document.getElementById('usernameInput')
const joinButton = document.getElementById('joinButton')
const leaveButton = document.getElementById('leaveButton')
const currentUserSpan = document.getElementById('currentUser')
const usersList = document.getElementById('usersList')
const messagesDiv = document.getElementById('messages')
const messageInput = document.getElementById('messageInput')
const sendButton = document.getElementById('sendButton')

let currentUsername = ''
let onlineUsers = []

// Format time
function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// Add message to chat
function addMessage(messageData, type = 'chat') {
  const messageGroup = document.createElement('div')
  messageGroup.className = `message-group ${messageData.username === currentUsername ? 'own' : ''}`
  
  if (type === 'system') {
    const systemMessage = document.createElement('div')
    systemMessage.className = 'message system'
    systemMessage.textContent = messageData.text
    messagesDiv.appendChild(systemMessage)
  } else {
    // Add message header with username and time
    const messageHeader = document.createElement('div')
    messageHeader.className = 'message-header'
    messageHeader.textContent = `${messageData.username} • ${formatTime(messageData.timestamp)}`
    
    // Add message content
    const messageElement = document.createElement('div')
    messageElement.className = `message ${messageData.username === currentUsername ? 'own' : ''}`
    messageElement.textContent = messageData.text
    
    messageGroup.appendChild(messageHeader)
    messageGroup.appendChild(messageElement)
    messagesDiv.appendChild(messageGroup)
  }
  
  messagesDiv.scrollTop = messagesDiv.scrollHeight
}

// Update online users list
function updateUsersList(users) {
  onlineUsers = users
  usersList.innerHTML = ''
  
  users.forEach(user => {
    const userTag = document.createElement('span')
    userTag.className = `user-tag ${user === currentUsername ? 'current-user' : ''}`
    userTag.textContent = user
    usersList.appendChild(userTag)
  })
}

// Join chat room
function joinChat() {
  const username = usernameInput.value.trim()
  if (username.length < 2) {
    alert('Username must be at least 2 characters long')
    return
  }
  
  if (username.length > 20) {
    alert('Username must be less than 20 characters')
    return
  }
  
  currentUsername = username
  socket.emit('join chat', username)
}

// Send message
function sendMessage() {
  const message = messageInput.value.trim()
  if (message && currentUsername) {
    socket.emit('chat message', {
      text: message,
      username: currentUsername,
      timestamp: new Date().toISOString()
    })
    messageInput.value = ''
  }
}

// Leave chat
function leaveChat() {
  socket.emit('leave chat')
  loginForm.style.display = 'block'
  chatApp.style.display = 'none'
  messagesDiv.innerHTML = ''
  currentUsername = ''
  usernameInput.value = ''
}

// Socket event listeners
socket.on('join success', (data) => {
  loginForm.style.display = 'none'
  chatApp.style.display = 'flex'
  currentUserSpan.textContent = `Welcome, ${currentUsername}!`
  messageInput.disabled = false
  sendButton.disabled = false
  updateUsersList(data.users)
})

socket.on('join error', (error) => {
  alert(error)
})

socket.on('user joined', (data) => {
  updateUsersList(data.users)
  addMessage({
    text: `${data.username} joined the chat`,
    timestamp: new Date().toISOString()
  }, 'system')
})

socket.on('user left', (data) => {
  updateUsersList(data.users)
  addMessage({
    text: `${data.username} left the chat`,
    timestamp: new Date().toISOString()
  }, 'system')
})

socket.on('chat message', (messageData) => {
  addMessage(messageData)
})

socket.on('users list', (users) => {
  updateUsersList(users)
})

socket.on('connect', () => {
  console.log('Connected to chat server')
})

socket.on('disconnect', () => {
  console.log('Disconnected from chat server')
  if (currentUsername) {
    alert('Connection lost. Please rejoin the chat.')
    leaveChat()
  }
})

// Event listeners
joinButton.addEventListener('click', joinChat)
usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    joinChat()
  }
})

leaveButton.addEventListener('click', leaveChat)

sendButton.addEventListener('click', sendMessage)
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage()
  }
})

console.log('Enhanced chat app initialized!')
