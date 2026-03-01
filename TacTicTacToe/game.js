import { initializeOnlineGame, sendMove, listenForMoves, closeConnection } from './firebase-config.js';

class TacticalTicTacToe {
    constructor() {
        // Game state
        this.miniBoards = Array(9).fill(null).map(() => Array(9).fill(null));
        this.miniBoardWinners = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.activeBoard = null; // null means any board is available
        this.gameOver = false;
        this.isOnlineGame = false;
        this.roomCode = null;
        this.mySymbol = null;
        
        // DOM elements
        this.gameBoardEl = document.getElementById('gameBoard');
        this.currentPlayerEl = document.getElementById('currentPlayer');
        this.gameStatusEl = document.getElementById('gameStatus');
        this.gameModeEl = document.getElementById('gameMode');
        this.roomCodeEl = document.getElementById('roomCode');
        
        // Modals
        this.onlineModal = document.getElementById('onlineModal');
        this.winnerModal = document.getElementById('winnerModal');
        
        this.init();
    }
    
    init() {
        this.renderBoard();
        this.attachEventListeners();
    }
    
    attachEventListeners() {
        // New Game button
        document.getElementById('newGameBtn').addEventListener('click', () => {
            if (this.isOnlineGame) {
                closeConnection();
            }
            this.resetGame();
        });
        
        // Online Game button
        document.getElementById('onlineGameBtn').addEventListener('click', () => {
            this.showOnlineModal();
        });
        
        // Modal buttons
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.hideOnlineModal();
        });
        
        document.getElementById('createRoomBtn').addEventListener('click', () => {
            this.createOnlineRoom();
        });
        
        document.getElementById('joinRoomBtn').addEventListener('click', () => {
            const roomCode = document.getElementById('roomCodeInput').value.trim().toUpperCase();
            if (roomCode) {
                this.joinOnlineRoom(roomCode);
            }
        });
        
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.hideWinnerModal();
            if (this.isOnlineGame) {
                closeConnection();
            }
            this.resetGame();
        });
        
        // Enter key for room code input
        document.getElementById('roomCodeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('joinRoomBtn').click();
            }
        });
    }
    
    renderBoard() {
        this.gameBoardEl.innerHTML = '';
        
        for (let boardIdx = 0; boardIdx < 9; boardIdx++) {
            const miniBoardEl = document.createElement('div');
            miniBoardEl.className = 'mini-board';
            miniBoardEl.dataset.board = boardIdx;
            
            // Add active class if this is the active board
            if (this.activeBoard === null || this.activeBoard === boardIdx) {
                if (!this.miniBoardWinners[boardIdx] && !this.gameOver) {
                    miniBoardEl.classList.add('active');
                }
            }
            
            // Mark won boards
            if (this.miniBoardWinners[boardIdx]) {
                miniBoardEl.classList.add(`won-${this.miniBoardWinners[boardIdx].toLowerCase()}`);
                miniBoardEl.dataset.winner = this.miniBoardWinners[boardIdx];
            }
            
            // Render cells
            for (let cellIdx = 0; cellIdx < 9; cellIdx++) {
                const cellEl = document.createElement('div');
                cellEl.className = 'cell';
                cellEl.dataset.board = boardIdx;
                cellEl.dataset.cell = cellIdx;
                
                const cellValue = this.miniBoards[boardIdx][cellIdx];
                if (cellValue) {
                    cellEl.textContent = cellValue;
                    cellEl.classList.add('occupied', cellValue.toLowerCase());
                } else if (!this.miniBoardWinners[boardIdx]) {
                    cellEl.addEventListener('click', () => this.handleCellClick(boardIdx, cellIdx));
                }
                
                miniBoardEl.appendChild(cellEl);
            }
            
            this.gameBoardEl.appendChild(miniBoardEl);
        }
        
        this.updateStatus();
    }
    
    handleCellClick(boardIdx, cellIdx) {
        // Check if it's an online game and if it's my turn
        if (this.isOnlineGame && this.mySymbol !== this.currentPlayer) {
            this.gameStatusEl.textContent = "It's not your turn!";
            return;
        }
        
        // Check if the game is over
        if (this.gameOver) return;
        
        // Check if the mini-board is already won
        if (this.miniBoardWinners[boardIdx]) return;
        
        // Check if the cell is already occupied
        if (this.miniBoards[boardIdx][cellIdx]) return;
        
        // Check if this is the active board (or any board is active)
        if (this.activeBoard !== null && this.activeBoard !== boardIdx) return;
        
        // Make the move
        this.makeMove(boardIdx, cellIdx);
    }
    
    makeMove(boardIdx, cellIdx) {
        // Place the mark
        this.miniBoards[boardIdx][cellIdx] = this.currentPlayer;
        
        // Check if this mini-board is won
        const miniBoardWinner = this.checkMiniBoardWinner(boardIdx);
        if (miniBoardWinner) {
            this.miniBoardWinners[boardIdx] = miniBoardWinner;
            
            // Check if the game is won
            const gameWinner = this.checkGameWinner();
            if (gameWinner) {
                this.gameOver = true;
                this.showWinner(gameWinner);
            }
        }
        
        // Determine the next active board
        if (this.miniBoardWinners[cellIdx] || this.isBoardFull(cellIdx)) {
            // If the next board is won or full, allow any board
            this.activeBoard = null;
        } else {
            // Otherwise, the next player must play in the corresponding board
            this.activeBoard = cellIdx;
        }
        
        // Check for tie
        if (!this.gameOver && this.isGameTied()) {
            this.gameOver = true;
            this.showWinner(null);
        }
        
        // Send move if online game
        if (this.isOnlineGame && this.roomCode) {
            sendMove(this.roomCode, {
                boardIdx,
                cellIdx,
                player: this.currentPlayer,
                activeBoard: this.activeBoard,
                miniBoardWinners: this.miniBoardWinners,
                gameOver: this.gameOver
            });
        }
        
        // Switch player
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        
        // Re-render the board
        this.renderBoard();
    }
    
    checkMiniBoardWinner(boardIdx) {
        const board = this.miniBoards[boardIdx];
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];
        
        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }
        
        return null;
    }
    
    checkGameWinner() {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];
        
        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (this.miniBoardWinners[a] && 
                this.miniBoardWinners[a] === this.miniBoardWinners[b] && 
                this.miniBoardWinners[a] === this.miniBoardWinners[c]) {
                return this.miniBoardWinners[a];
            }
        }
        
        return null;
    }
    
    isBoardFull(boardIdx) {
        return this.miniBoards[boardIdx].every(cell => cell !== null);
    }
    
    isGameTied() {
        // Check if all mini-boards are either won or full
        return this.miniBoardWinners.every((winner, idx) => 
            winner !== null || this.isBoardFull(idx)
        );
    }
    
    updateStatus() {
        // Update current player display
        if (this.gameOver) {
            this.currentPlayerEl.innerHTML = '<span class="text-purple-400">Game Over</span>';
        } else {
            const color = this.currentPlayer === 'X' ? 'text-red-500' : 'text-purple-500';
            this.currentPlayerEl.innerHTML = `<span class="${color}">${this.currentPlayer}</span>`;
        }
        
        // Update game status message
        if (this.gameOver) {
            this.gameStatusEl.textContent = '';
        } else if (this.isOnlineGame && this.mySymbol !== this.currentPlayer) {
            this.gameStatusEl.textContent = "Waiting for opponent's move...";
            this.gameStatusEl.className = 'max-w-4xl mx-auto mt-6 text-center text-xl font-semibold text-purple-300 waiting';
        } else if (this.activeBoard === null) {
            this.gameStatusEl.textContent = 'Play in any available mini-board!';
            this.gameStatusEl.className = 'max-w-4xl mx-auto mt-6 text-center text-xl font-semibold text-purple-400';
        } else {
            this.gameStatusEl.textContent = `Play in the highlighted mini-board`;
            this.gameStatusEl.className = 'max-w-4xl mx-auto mt-6 text-center text-xl font-semibold text-purple-400';
        }
    }
    
    showWinner(winner) {
        const winnerText = document.getElementById('winnerText');
        const winnerMessage = document.getElementById('winnerMessage');
        
        if (winner) {
            const color = winner === 'X' ? 'text-red-500' : 'text-purple-500';
            winnerText.innerHTML = `<span class="${color}">Player ${winner} Wins!</span>`;
            winnerMessage.textContent = 'Congratulations! 🎉';
        } else {
            winnerText.innerHTML = '<span class="text-purple-300">It\'s a Tie!</span>';
            winnerMessage.textContent = 'Well played! Neither player could win.';
        }
        
        this.winnerModal.classList.add('active');
    }
    
    hideWinnerModal() {
        this.winnerModal.classList.remove('active');
    }
    
    showOnlineModal() {
        this.onlineModal.classList.add('active');
        document.getElementById('roomCodeInput').value = '';
    }
    
    hideOnlineModal() {
        this.onlineModal.classList.remove('active');
    }
    
    async createOnlineRoom() {
        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = `
            <div class="text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p class="text-purple-200">Creating room...</p>
            </div>
        `;
        
        try {
            const result = await initializeOnlineGame('create');
            this.roomCode = result.roomCode;
            this.mySymbol = result.symbol;
            this.isOnlineGame = true;
            
            modalContent.innerHTML = `
                <div class="text-center">
                    <div class="mb-4">
                        <div class="text-sm text-purple-300 mb-2">Room Code</div>
                        <div class="text-4xl font-mono font-bold text-purple-400 mb-4">${this.roomCode}</div>
                        <div class="text-sm text-purple-300 mb-2">You are player</div>
                        <div class="text-3xl font-bold ${this.mySymbol === 'X' ? 'text-red-500' : 'text-purple-500'}">${this.mySymbol}</div>
                    </div>
                    <div class="animate-pulse text-purple-300">
                        Waiting for opponent to join...
                    </div>
                </div>
            `;
            
            // Update UI
            this.gameModeEl.textContent = 'Online';
            this.roomCodeEl.textContent = this.roomCode;
            
            // Listen for opponent and moves
            listenForMoves(this.roomCode, (moveData) => {
                if (moveData.player !== this.mySymbol) {
                    this.receiveMove(moveData);
                }
            }, () => {
                // Opponent joined
                this.hideOnlineModal();
                this.resetGame();
            });
            
        } catch (error) {
            console.error('Error creating room:', error);
            modalContent.innerHTML = `
                <div class="text-center text-red-500">
                    <p class="font-semibold mb-2">Error creating room</p>
                    <p class="text-sm">${error.message}</p>
                </div>
            `;
        }
    }
    
    async joinOnlineRoom(roomCode) {
        const modalContent = document.getElementById('modalContent');
        modalContent.innerHTML = `
            <div class="text-center">
                <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p class="text-purple-200">Joining room...</p>
            </div>
        `;
        
        try {
            const result = await initializeOnlineGame('join', roomCode);
            this.roomCode = result.roomCode;
            this.mySymbol = result.symbol;
            this.isOnlineGame = true;
            
            // Update UI
            this.gameModeEl.textContent = 'Online';
            this.roomCodeEl.textContent = this.roomCode;
            
            this.hideOnlineModal();
            this.resetGame();
            
            // Listen for moves
            listenForMoves(this.roomCode, (moveData) => {
                if (moveData.player !== this.mySymbol) {
                    this.receiveMove(moveData);
                }
            });
            
        } catch (error) {
            console.error('Error joining room:', error);
            modalContent.innerHTML = `
                <div class="text-center text-red-500">
                    <p class="font-semibold mb-2">Error joining room</p>
                    <p class="text-sm">${error.message}</p>
                </div>
            `;
        }
    }
    
    receiveMove(moveData) {
        // Apply the received move
        this.miniBoards[moveData.boardIdx][moveData.cellIdx] = moveData.player;
        this.miniBoardWinners = moveData.miniBoardWinners;
        this.activeBoard = moveData.activeBoard;
        this.gameOver = moveData.gameOver;
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        
        if (this.gameOver) {
            const winner = this.checkGameWinner();
            this.showWinner(winner);
        }
        
        this.renderBoard();
    }
    
    resetGame() {
        this.miniBoards = Array(9).fill(null).map(() => Array(9).fill(null));
        this.miniBoardWinners = Array(9).fill(null);
        this.currentPlayer = 'X';
        this.activeBoard = null;
        this.gameOver = false;
        
        if (!this.isOnlineGame) {
            this.roomCode = null;
            this.mySymbol = null;
            this.gameModeEl.textContent = 'Local';
            this.roomCodeEl.textContent = '-';
        }
        
        this.renderBoard();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new TacticalTicTacToe();
});
