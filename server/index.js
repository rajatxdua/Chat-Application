// Enhanced Express + Socket.IO server for chat with user management
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store connected users
const connectedUsers = new Map(); // socketId -> username
const usernames = new Set(); // Track taken usernames

// Helper function to get all connected usernames
function getConnectedUsernames() {
  return Array.from(connectedUsers.values()).sort();
}

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Handle user joining chat
  socket.on('join chat', (username) => {
    // Validate username
    if (!username || username.trim().length < 2) {
      socket.emit('join error', 'Username must be at least 2 characters long');
      return;
    }
    
    if (username.trim().length > 20) {
      socket.emit('join error', 'Username must be less than 20 characters');
      return;
    }
    
    const cleanUsername = username.trim();
    
    // Check if username is already taken
    if (usernames.has(cleanUsername.toLowerCase())) {
      socket.emit('join error', 'Username is already taken. Please choose another one.');
      return;
    }
    
    // Add user to connected users
    connectedUsers.set(socket.id, cleanUsername);
    usernames.add(cleanUsername.toLowerCase());
    
    // Send success response to the joining user
    socket.emit('join success', {
      username: cleanUsername,
      users: getConnectedUsernames()
    });
    
    // Notify all other users that someone joined
    socket.broadcast.emit('user joined', {
      username: cleanUsername,
      users: getConnectedUsernames()
    });
    
    console.log(`${cleanUsername} joined the chat`);
  });
  
  // Handle user leaving chat
  socket.on('leave chat', () => {
    handleUserDisconnect(socket);
  });
  
  // Handle chat messages
  socket.on('chat message', (messageData) => {
    const username = connectedUsers.get(socket.id);
    
    if (!username) {
      socket.emit('join error', 'You must join the chat first');
      return;
    }
    
    const completeMessageData = {
      text: messageData.text,
      username: username,
      timestamp: messageData.timestamp || new Date().toISOString(),
      socketId: socket.id
    };
    
    // Broadcast message to all connected users
    io.emit('chat message', completeMessageData);
    console.log(`${username}: ${messageData.text}`);
  });
  
  // Handle user disconnect
  socket.on('disconnect', () => {
    handleUserDisconnect(socket);
  });
  
  // Helper function to handle user disconnect
  function handleUserDisconnect(socket) {
    const username = connectedUsers.get(socket.id);
    
    if (username) {
      // Remove user from tracking
      connectedUsers.delete(socket.id);
      usernames.delete(username.toLowerCase());
      
      // Notify all users that someone left
      socket.broadcast.emit('user left', {
        username: username,
        users: getConnectedUsernames()
      });
      
      console.log(`${username} left the chat`);
    } else {
      console.log('User disconnected:', socket.id);
    }
  }
});

app.get('/', (req, res) => {
  res.send(`
    <h1>Chat Server Status</h1>
    <p>Server is running successfully!</p>
    <p>Connected users: ${connectedUsers.size}</p>
    <p>Active usernames: ${getConnectedUsernames().join(', ') || 'None'}</p>
    <p>Frontend: <a href="http://localhost:5174">http://localhost:5174</a></p>
  `);
});

// API endpoint to get server stats (useful for deployment monitoring)
app.get('/api/stats', (req, res) => {
  res.json({
    connectedUsers: connectedUsers.size,
    usernames: getConnectedUsernames(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Chat server listening on port ${PORT}`);
  console.log(`Frontend should connect to: http://localhost:${PORT}`);
});
