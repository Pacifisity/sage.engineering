// Firebase Configuration
// Replace these with your actual Firebase config values
const firebaseConfig = {
  apiKey: "AIzaSyBQyBrLXnjj8jlMRgU6l1lNH8A836hKvFE",
  authDomain: "tactical-tictactoe.firebaseapp.com",
  databaseURL: "https://tactical-tictactoe-default-rtdb.firebaseio.com",
  projectId: "tactical-tictactoe",
  storageBucket: "tactical-tictactoe.firebasestorage.app",
  messagingSenderId: "47238236116",
  appId: "1:47238236116:web:f9aab5c856eb0f60e03841"
};

let db = null;
let currentRoomRef = null;
let movesListener = null;

// Initialize Firebase
async function initFirebase() {
    if (db) return;
    
    try {
        // Import Firebase modules
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
        const { getDatabase, ref, set, push, onValue, get, update, onDisconnect, remove } = 
            await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js');
        
        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        
        window.firebaseDB = { getDatabase, ref, set, push, onValue, get, update, onDisconnect, remove };
        
        console.log('Firebase initialized successfully');
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        throw new Error('Failed to initialize Firebase. Check your configuration.');
    }
}

// Generate a random room code
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Initialize online game
export async function initializeOnlineGame(mode, roomCode = null) {
    await initFirebase();
    const { ref, set, get, update, onDisconnect } = window.firebaseDB;
    
    if (mode === 'create') {
        // Create a new room
        const newRoomCode = generateRoomCode();
        const roomRef = ref(db, `rooms/${newRoomCode}`);
        
        // Check if room already exists
        const snapshot = await get(roomRef);
        if (snapshot.exists()) {
            // Try again with a different code
            return initializeOnlineGame('create');
        }
        
        // Create the room
        await set(roomRef, {
            player1: 'X',
            player2: null,
            currentPlayer: 'X',
            createdAt: Date.now(),
            status: 'waiting'
        });
        
        // Set up disconnect handler to clean up room
        const disconnectRef = onDisconnect(roomRef);
        disconnectRef.remove();
        
        currentRoomRef = roomRef;
        
        return {
            roomCode: newRoomCode,
            symbol: 'X'
        };
        
    } else if (mode === 'join') {
        // Join an existing room
        if (!roomCode) {
            throw new Error('Room code is required to join a game');
        }
        
        const roomRef = ref(db, `rooms/${roomCode}`);
        const snapshot = await get(roomRef);
        
        if (!snapshot.exists()) {
            throw new Error('Room not found. Please check the room code.');
        }
        
        const roomData = snapshot.val();
        
        if (roomData.player2) {
            throw new Error('Room is full. Please try a different room code.');
        }
        
        if (roomData.status !== 'waiting') {
            throw new Error('Game already in progress.');
        }
        
        // Join the room as player 2
        await update(roomRef, {
            player2: 'O',
            status: 'active'
        });
        
        currentRoomRef = roomRef;
        
        return {
            roomCode: roomCode,
            symbol: 'O'
        };
    }
}

// Send a move to Firebase
export async function sendMove(roomCode, moveData) {
    if (!db) return;
    
    const { ref, push } = window.firebaseDB;
    const movesRef = ref(db, `rooms/${roomCode}/moves`);
    
    await push(movesRef, {
        ...moveData,
        timestamp: Date.now()
    });
}

// Listen for moves from opponent
export function listenForMoves(roomCode, onMoveCallback, onOpponentJoinCallback = null) {
    if (!db) return;
    
    const { ref, onValue } = window.firebaseDB;
    
    // Listen for opponent joining
    if (onOpponentJoinCallback) {
        const roomRef = ref(db, `rooms/${roomCode}`);
        const unsubscribeRoom = onValue(roomRef, (snapshot) => {
            const roomData = snapshot.val();
            if (roomData && roomData.player2 && roomData.status === 'active') {
                onOpponentJoinCallback();
                unsubscribeRoom(); // Stop listening after opponent joins
            }
        });
    }
    
    // Listen for moves
    const movesRef = ref(db, `rooms/${roomCode}/moves`);
    movesListener = onValue(movesRef, (snapshot) => {
        const moves = snapshot.val();
        if (moves) {
            const movesArray = Object.values(moves);
            const lastMove = movesArray[movesArray.length - 1];
            onMoveCallback(lastMove);
        }
    });
}

// Close connection and clean up
export function closeConnection() {
    if (movesListener) {
        movesListener();
        movesListener = null;
    }
    
    if (currentRoomRef && db) {
        const { remove } = window.firebaseDB;
        // Optionally remove the room (or let it expire)
        // remove(currentRoomRef);
    }
    
    currentRoomRef = null;
}
