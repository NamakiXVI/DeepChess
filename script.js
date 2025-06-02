        // Chess board initialization
        document.addEventListener('DOMContentLoaded', () => {
            const board = document.getElementById('board');
            const movesLog = document.getElementById('moves-log');
            const statusBar = document.getElementById('status-bar');
            const apiStatus = document.getElementById('api-status');
            const userCaptured = document.getElementById('user-captured');
            const aiCaptured = document.getElementById('ai-captured');
            
            // Game state
            let selectedPiece = null;
            let currentPlayer = 'white';
            let moveHistory = [];
            let boardState = {};
            let lastMoveFrom = null;
            let lastMoveTo = null;
            let gameOver = false;
            let whiteKingPos = 'e1';
            let blackKingPos = 'e8';
            let checkState = { white: false, black: false };
            let useAPI = true;
            let apiKey = 'YOUR_API_KEY_HERE'; // Replace with your actual API key

            let isDeep = true;
            let isGemini = false;
            let whiteTime = 10 * 60; // 15 minutes in seconds
            let blackTime = 10 * 60;
            let timerInterval = null;
            let currentTimer = null;
            
            // Initialize the board
            initBoard();
            
            // Initialize the chess board
            function initBoard() {
                createChessBoard();
                setupBoardEvents();
                setupButtonEvents();
            }
            
            // Generate chess board
            function createChessBoard() {
                const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                const numbers = ['8', '7', '6', '5', '4', '3', '2', '1'];
                
                // Clear the board
                board.innerHTML = '';
                boardState = {};
                
                for (let row = 0; row < 8; row++) {
                    for (let col = 0; col < 8; col++) {
                        const square = document.createElement('div');
                        const isWhite = (row + col) % 2 === 0;
                        const position = `${letters[col]}${numbers[row]}`;
                        square.className = `square ${isWhite ? 'white' : 'black'}`;
                        square.dataset.position = position;
                        square.dataset.row = row;
                        square.dataset.col = col;
                        
                        // Highlight last move
                        if (lastMoveFrom === position || lastMoveTo === position) {
                            square.classList.add('last-move');
                        }
                        
                        // Highlight king in check
                        if (checkState.white && position === whiteKingPos) {
                            square.classList.add('in-check');
                        }
                        if (checkState.black && position === blackKingPos) {
                            square.classList.add('in-check');
                        }
                        
                        // Add file coordinate (letters)
                        if (row === 7) {
                            const fileCoord = document.createElement('div');
                            fileCoord.className = 'coord file';
                            fileCoord.textContent = letters[col];
                            square.appendChild(fileCoord);
                        }
                        
                        // Add rank coordinate (numbers)
                        if (col === 0) {
                            const rankCoord = document.createElement('div');
                            rankCoord.className = 'coord rank';
                            rankCoord.textContent = numbers[row];
                            square.appendChild(rankCoord);
                        }
                        
                        // Add pieces
                        let piece = null;
                        let pieceColor = null;
                        
                        // Black pieces (top rows)
                        if (row === 0) {
                            if (col === 0 || col === 7) piece = '♜'; // Rook
                            if (col === 1 || col === 6) piece = '♞'; // Knight
                            if (col === 2 || col === 5) piece = '♝'; // Bishop
                            if (col === 3) piece = '♛'; // Queen
                            if (col === 4) piece = '♚'; // King
                            pieceColor = 'black';
                        }
                        if (row === 1) {
                            piece = '♟'; // Pawn
                            pieceColor = 'black';
                        }
                        
                        // White pieces (bottom rows)
                        if (row === 6) {
                            piece = '♙'; // Pawn
                            pieceColor = 'white';
                        }
                        if (row === 7) {
                            if (col === 0 || col === 7) piece = '♖'; // Rook
                            if (col === 1 || col === 6) piece = '♘'; // Knight
                            if (col === 2 || col === 5) piece = '♗'; // Bishop
                            if (col === 3) piece = '♕'; // Queen
                            if (col === 4) piece = '♔'; // King
                            pieceColor = 'white';
                        }
                        
                        if (piece) {
                            const pieceElement = document.createElement('div');
                            pieceElement.className = 'piece';
                            pieceElement.textContent = piece;
                            pieceElement.dataset.type = piece;
                            pieceElement.dataset.color = pieceColor;
                            square.appendChild(pieceElement);
                            
                            // Save to board state
                            boardState[position] = {
                                piece: piece,
                                color: pieceColor
                            };
                            
                            // Track king positions
                            if (piece === '♔') whiteKingPos = position;
                            if (piece === '♚') blackKingPos = position;
                        }
                        
                        board.appendChild(square);
                    }
                }
            }
            
            // Calculate possible moves based on piece type and position
            function calculatePossibleMoves(piece, color, position) {
                const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                const col = letters.indexOf(position[0]);
                const row = 8 - parseInt(position[1]);
                const moves = [];
                
                // Helper function to add move if valid
                const addMove = (r, c, isCapture) => {
                    if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                        const newPos = `${letters[c]}${8 - r}`;
                        const targetPiece = boardState[newPos];
                        
                        // Only add if target square is empty or has opponent's piece
                        if (!targetPiece || (targetPiece && targetPiece.color !== color)) {
                            moves.push({
                                position: newPos,
                                isCapture: isCapture || (targetPiece && targetPiece.color !== color)
                            });
                        }
                    }
                };
                
                switch(piece) {
                    case '♙': // White pawn
                    case '♟': // Black pawn
                        const direction = piece === '♙' ? -1 : 1; // White moves up, black down
                        // Move forward
                        if (!boardState[`${letters[col]}${8 - (row + direction)}`]) {
                            addMove(row + direction, col, false);
                            // Starting double move
                            if ((piece === '♙' && row === 6 && !boardState[`${letters[col]}${8 - (row + 2 * direction)}`]) || 
                                (piece === '♟' && row === 1 && !boardState[`${letters[col]}${8 - (row + 2 * direction)}`])) {
                                addMove(row + 2 * direction, col, false);
                            }
                        }
                        // Capture diagonally
                        const leftCapture = boardState[`${letters[col-1]}${8 - (row + direction)}`];
                        if (leftCapture && leftCapture.color !== color) {
                            addMove(row + direction, col - 1, true);
                        }
                        const rightCapture = boardState[`${letters[col+1]}${8 - (row + direction)}`];
                        if (rightCapture && rightCapture.color !== color) {
                            addMove(row + direction, col + 1, true);
                        }
                        break;
                        
                    case '♘': // White knight
                    case '♞': // Black knight
                        const knightMoves = [
                            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
                            [1, -2], [1, 2], [2, -1], [2, 1]
                        ];
                        knightMoves.forEach(([rOffset, cOffset]) => {
                            addMove(row + rOffset, col + cOffset, true);
                        });
                        break;
                        
                    case '♗': // White bishop
                    case '♝': // Black bishop
                        const bishopDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
                        bishopDirections.forEach(([rDir, cDir]) => {
                            for (let i = 1; i < 8; i++) {
                                const newRow = row + i * rDir;
                                const newCol = col + i * cDir;
                                const newPos = `${letters[newCol]}${8 - newRow}`;
                                const targetPiece = boardState[newPos];
                                
                                if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) break;
                                
                                if (!targetPiece) {
                                    moves.push({ position: newPos, isCapture: false });
                                } else if (targetPiece.color !== color) {
                                    moves.push({ position: newPos, isCapture: true });
                                    break;
                                } else {
                                    break;
                                }
                            }
                        });
                        break;
                        
                    case '♖': // White rook
                    case '♜': // Black rook
                        const rookDirections = [[-1, 0], [1, 0], [0, -1], [0, 1]];
                        rookDirections.forEach(([rDir, cDir]) => {
                            for (let i = 1; i < 8; i++) {
                                const newRow = row + i * rDir;
                                const newCol = col + i * cDir;
                                const newPos = `${letters[newCol]}${8 - newRow}`;
                                const targetPiece = boardState[newPos];
                                
                                if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) break;
                                
                                if (!targetPiece) {
                                    moves.push({ position: newPos, isCapture: false });
                                } else if (targetPiece.color !== color) {
                                    moves.push({ position: newPos, isCapture: true });
                                    break;
                                } else {
                                    break;
                                }
                            }
                        });
                        break;
                        
                    case '♕': // White queen
                    case '♛': // Black queen
                        const queenDirections = [
                            [-1, -1], [-1, 0], [-1, 1],
                            [0, -1],           [0, 1],
                            [1, -1],  [1, 0],  [1, 1]
                        ];
                        queenDirections.forEach(([rDir, cDir]) => {
                            for (let i = 1; i < 8; i++) {
                                const newRow = row + i * rDir;
                                const newCol = col + i * cDir;
                                const newPos = `${letters[newCol]}${8 - newRow}`;
                                const targetPiece = boardState[newPos];
                                
                                if (newRow < 0 || newRow > 7 || newCol < 0 || newCol > 7) break;
                                
                                if (!targetPiece) {
                                    moves.push({ position: newPos, isCapture: false });
                                } else if (targetPiece.color !== color) {
                                    moves.push({ position: newPos, isCapture: true });
                                    break;
                                } else {
                                    break;
                                }
                            }
                        });
                        break;
                        
                    case '♔': // White king
                    case '♚': // Black king
                        const kingMoves = [
                            [-1, -1], [-1, 0], [-1, 1],
                            [0, -1],           [0, 1],
                            [1, -1],  [1, 0],  [1, 1]
                        ];
                        kingMoves.forEach(([rOffset, cOffset]) => {
                            addMove(row + rOffset, col + cOffset, true);
                        });
                        break;
                }
                
                return moves;
            }
            
            // Show possible moves on the board
            function showPossibleMoves(moves) {
                moves.forEach(move => {
                    const square = document.querySelector(`.square[data-position="${move.position}"]`);
                    if (square) {
                        const marker = document.createElement('div');
                        marker.className = move.isCapture ? 'possible-capture' : 'possible-move';
                        square.appendChild(marker);
                    }
                });
            }
            
            // Clear all possible move markers
            function clearPossibleMoves() {
                document.querySelectorAll('.possible-move, .possible-capture').forEach(marker => {
                    marker.remove();
                });
            }
            
            // Move a piece on the board
            function movePiece(fromPos, toPos) {
                if (gameOver) return;
                
                const fromSquare = document.querySelector(`.square[data-position="${fromPos}"]`);
                const toSquare = document.querySelector(`.square[data-position="${toPos}"]`);
                const pieceElement = fromSquare.querySelector('.piece');
                const pieceType = pieceElement.textContent;
                const pieceColor = pieceElement.dataset.color;
                
                // Update king position if king is moving
                if (pieceType === '♔') whiteKingPos = toPos;
                if (pieceType === '♚') blackKingPos = toPos;
                
                // Capture piece if exists
                if (toSquare.querySelector('.piece')) {
                    const capturedPiece = toSquare.querySelector('.piece');
                    const capturedType = capturedPiece.textContent;
                    const capturedColor = capturedPiece.dataset.color;
                    
                    // Add to captured pieces
                    const captureContainer = capturedColor === 'black' ? userCaptured : aiCaptured;
                    const captureEl = document.createElement('span');
                    captureEl.className = 'captured-piece';
                    captureEl.textContent = capturedType;
                    captureContainer.appendChild(captureEl);
                    
                    // Remove captured piece
                    capturedPiece.remove();
                    
                    // Check if king was captured (game over)
                    if (capturedType === '♔' || capturedType === '♚') {
                        gameOver = true;
                        showGameOver(pieceColor === 'white' ? 'white' : 'black');
                        return;
                    }
                }
                
                // Move the piece
                toSquare.appendChild(pieceElement);
                
                // Update board state
                boardState[toPos] = {
                    piece: pieceType,
                    color: pieceColor
                };
                delete boardState[fromPos];
                
                // Animate the move
                pieceElement.style.animation = 'piece-move 0.3s';
                setTimeout(() => {
                    pieceElement.style.animation = '';
                }, 300);
                
                // Highlight last move
                document.querySelectorAll('.last-move').forEach(sq => {
                    sq.classList.remove('last-move');
                });
                fromSquare.classList.add('last-move');
                toSquare.classList.add('last-move');
                lastMoveFrom = fromPos;
                lastMoveTo = toPos;
                
                // Update move history
                const moveNumber = Math.floor(moveHistory.length / 2) + 1;
                const moveEntry = {
                    piece: pieceType,
                    from: fromPos,
                    to: toPos
                };
                
                if (currentPlayer === 'white') {
                    moveHistory.push({
                        number: moveNumber,
                        white: moveEntry,
                        black: null
                    });
                } else {
                    moveHistory[moveHistory.length - 1].black = moveEntry;
                }
                
                updateMoveLog();
                
                // Check for check/checkmate
                detectCheckAndMate();
                
                // Switch player
                currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
                
                if (gameOver) {
                    stopTimer();
                    return;
                }

                startTimer();
                
                statusBar.innerHTML = currentPlayer === 'white' 
                    ? '<span>Your turn. Make a move!</span>' 
                    : '<span class="thinking">DeepChess AI is thinking...</span>';
                
                // If it's AI's turn, make a move after a delay
                if (currentPlayer === 'black') {
                    if(isDeep)
                    {
                        setTimeout(makeDeepMove, 1500);
                    }
                    else
                    {
                        setTimeout(makeAIMove, 1500);
                    }
                }
            }
            
            // Timer functions
            function startTimer() {
                stopTimer(); // Clear any existing timer
                
                const timerElement = currentPlayer === 'white' ? 
                    document.getElementById('white-time') : 
                    document.getElementById('black-time');
                
                currentTimer = currentPlayer === 'white' ? whiteTime : blackTime;
                
                timerInterval = setInterval(() => {
                    currentTimer--;
                    
                    if (currentPlayer === 'white') {
                        whiteTime = currentTimer;
                    } else {
                        blackTime = currentTimer;
                    }
                    
                    updateTimerDisplays();
                    
                    // Check for time out
                    if (currentTimer <= 0) {
                        stopTimer();
                        gameOver = true;
                        showGameOver(currentPlayer === 'white' ? 'black' : 'white');
                    }
                    
                    // Add warning class when time is low
                    if (currentTimer <= 30) {
                        timerElement.classList.add('time-low');
                    }
                }, 1000);
            }
            
            function stopTimer() {
                if (timerInterval) {
                    clearInterval(timerInterval);
                    timerInterval = null;
                }
            }
            
            function updateTimerDisplays() {
                const whiteTimeElement = document.getElementById('white-time');
                const blackTimeElement = document.getElementById('black-time');
                
                whiteTimeElement.textContent = formatTime(whiteTime);
                blackTimeElement.textContent = formatTime(blackTime);
                
                // Toggle warning class based on time remaining
                whiteTimeElement.classList.toggle('time-low', whiteTime <= 30);
                blackTimeElement.classList.toggle('time-low', blackTime <= 30);
            }
            
            function formatTime(seconds) {
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
            }

            // Detect check and checkmate
            function detectCheckAndMate() {
                // Reset check state
                checkState.white = false;
                checkState.black = false;
                
                // Check if white king is in check
                if (isPositionAttacked(whiteKingPos, 'black')) {
                    checkState.white = true;
                    statusBar.innerHTML = '<span style="color:#ff7e5f">White king is in check!</span>';
                    document.querySelector(`.square[data-position="${whiteKingPos}"]`).classList.add('in-check');
                }
                
                // Check if black king is in check
                if (isPositionAttacked(blackKingPos, 'white')) {
                    checkState.black = true;
                    statusBar.innerHTML = '<span style="color:#ff7e5f">Black king is in check!</span>';
                    document.querySelector(`.square[data-position="${blackKingPos}"]`).classList.add('in-check');
                }
                
                // Check for checkmate
                if (checkState.white && !hasAnyValidMove('white')) {
                    gameOver = true;
                    showGameOver('black');
                } else if (checkState.black && !hasAnyValidMove('black')) {
                    gameOver = true;
                    showGameOver('white');
                }
            }
            
            // Check if a position is attacked by opponent
            function isPositionAttacked(position, byColor) {
                // Check all opponent pieces to see if they can attack this position
                for (const [pos, piece] of Object.entries(boardState)) {
                    if (piece.color === byColor) {
                        const moves = calculatePossibleMoves(piece.piece, piece.color, pos);
                        if (moves.some(move => move.position === position)) {
                            return true;
                        }
                    }
                }
                return false;
            }
            
            // Check if a player has any valid moves
            function hasAnyValidMove(color) {
                for (const [pos, piece] of Object.entries(boardState)) {
                    if (piece.color === color) {
                        const moves = calculatePossibleMoves(piece.piece, color, pos);
                        if (moves.length > 0) {
                            return true;
                        }
                    }
                }
                return false;
            }
    
            // Make AI move using the API
            async function makeDeepMove() {
                if (gameOver) return;
                
                // Show API thinking status
                statusBar.innerHTML = '<span class="api-thinking">DeepChess AI analyzing...</span>';

                if(isGemini)
                {
                    apiStatus.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> AI Engine: Contacting Gemini API';
                }else
                {
                    apiStatus.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> AI Engine: Contacting Deep Seek API';
                }
                
                // Try to get a move from the API
                try {
                    console.log("DeepSeek is being used");
                    if(!isGemini)
                    {
                        const move = await getAIMoveFromAPI();
                        if (move) {
                            movePiece(move.from, move.to);
                            console.log(move);
                            apiStatus.innerHTML = '<i class="fas fa-circle-check"></i> AI Engine: Deep Seek API';
                            return;
                        }
                    }
                    else
                    {
                        isGemini = true;
                        throw new Error(isGemini ? "isGemini is true" : "isGemini is false");
                    }
                } catch (e) {
                    try {
                        console.log("Gemini is being used");
                        const move = await getGeminiMoveFromAPI();
                        movePiece(move.from, move.to);
                        console.log(move);
                        apiStatus.innerHTML = '<i class="fas fa-circle-check"></i> AI Engine: Gemini API';
                        return;
                    } catch (e) {         
                        console.error('API error', e);
                        apiStatus.innerHTML = '<i class="fas fa-circle-exclamation"></i> AI Engine: Failed - Using local';
                        isDeep = false;
                    }
                }
                
                // Fallback to local AI if API fails
                apiStatus.innerHTML = '<i class="fas fa-microchip"></i> AI Engine: Local';
                
                // Find all possible moves for all AI pieces
                const allMoves = [];
                
                for (const [pos, piece] of Object.entries(boardState)) {
                    if (piece.color === 'black') {
                        const moves = calculatePossibleMoves(piece.piece, 'black', pos);
                        moves.forEach(move => {
                            allMoves.push({
                                from: pos,
                                to: move.position
                            });
                        });
                    }
                }
                
                if (allMoves.length === 0) {
                    // Stalemate or checkmate
                    if (checkState.black) {
                        gameOver = true;
                        showGameOver('white');
                    } else {
                        gameOver = true;
                        showGameOver('draw');
                    }
                    return;
                }
                
                // Pick a random move
                const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
                
                // Make the move
                movePiece(randomMove.from, randomMove.to);
            }


                // Optimized AI move function
                function makeAIMove() {
                    console.log("Local bot is being used");
                    if (gameOver) return;

                    // Start with simple checks that can return quickly
                    const quickChecks = [
                        checkForCaptureOpportunities,
                        checkForCheckOpportunities,
                        checkForPawnPromotions
                    ];

                    // Try quick checks first
                    for (const check of quickChecks) {
                        const move = check();
                        if (move) {
                            setTimeout(() => movePiece(move.from, move.to), 300); // Small delay for UX
                            return;
                        }
                    }

                    // If no quick moves found, proceed with normal move selection
                    setTimeout(() => {
                        // Find all possible moves for all AI pieces
                        const allMoves = [];
                        const pieces = Object.entries(boardState)
                            .filter(([_, piece]) => piece.color === 'black')
                            .sort((a, b) => {
                                // Sort by piece value (queen first, pawns last)
                                const pieceValues = {
                                    '♛': 9, '♜': 5, '♝': 3, '♞': 3, '♟': 1, '♚': 0
                                };
                                return pieceValues[b[1].piece] - pieceValues[a[1].piece];
                            });

                        // Limit to top 5 most valuable pieces to consider
                        for (const [pos, piece] of pieces.slice(0, 5)) {
                            const moves = calculatePossibleMoves(piece.piece, 'black', pos);
                            moves.forEach(move => {
                                allMoves.push({
                                    from: pos,
                                    to: move.position,
                                    isCapture: move.isCapture,
                                    piece: piece.piece
                                });
                            });

                            // If we already have enough moves, break early
                            if (allMoves.length > 10) break;
                        }

                        if (allMoves.length === 0) {
                            // Stalemate or checkmate
                            if (checkState.black) {
                                gameOver = true;
                                showGameOver('white');
                            } else {
                                gameOver = true;
                                showGameOver('draw');
                            }
                            return;
                        }

                        // Prioritize captures and checks
                        const captures = allMoves.filter(move => move.isCapture);
                        const checks = allMoves.filter(move => {
                            // Simulate move to see if it puts opponent in check
                            const originalState = {...boardState};
                            boardState[move.to] = {piece: move.piece, color: 'black'};
                            delete boardState[move.from];
                            const isCheck = isPositionAttacked(whiteKingPos, 'black');
                            boardState = originalState;
                            return isCheck;
                        });

                        // Prefer captures and checks
                        const preferredMoves = [...checks, ...captures];
                        const movePool = preferredMoves.length > 0 ? preferredMoves : allMoves;

                        // Select a random move from the preferred pool
                        const randomMove = movePool[Math.floor(Math.random() * movePool.length)];
                        movePiece(randomMove.from, randomMove.to);
                    }, 100); // Small delay for better UX
                }

                // Helper functions for quick checks
                function checkForCaptureOpportunities() {
                    // Look for any pieces that can capture opponent pieces
                    for (const [pos, piece] of Object.entries(boardState)) {
                        if (piece.color === 'black') {
                            const moves = calculatePossibleMoves(piece.piece, 'black', pos);
                            const captures = moves.filter(move => move.isCapture);
                            if (captures.length > 0) {
                                // Prefer higher value captures
                                captures.sort((a, b) => {
                                    const pieceValues = {
                                        '♕': 9, '♖': 5, '♗': 3, '♘': 3, '♙': 1, '♔': 0
                                    };
                                    const aValue = boardState[a.position] ? pieceValues[boardState[a.position].piece] : 0;
                                    const bValue = boardState[b.position] ? pieceValues[boardState[b.position].piece] : 0;
                                    return bValue - aValue;
                                });
                                return {from: pos, to: captures[0].position};
                            }
                        }
                    }
                    return null;
                }

                function checkForCheckOpportunities() {
                    // Look for moves that put opponent in check
                    for (const [pos, piece] of Object.entries(boardState)) {
                        if (piece.color === 'black') {
                            const moves = calculatePossibleMoves(piece.piece, 'black', pos);
                            for (const move of moves) {
                                // Simulate move to see if it puts opponent in check
                                const originalState = {...boardState};
                                boardState[move.position] = {piece: piece.piece, color: 'black'};
                                delete boardState[pos];
                                const isCheck = isPositionAttacked(whiteKingPos, 'black');
                                boardState = originalState;
                                if (isCheck) {
                                    return {from: pos, to: move.position};
                                }
                            }
                        }
                    }
                    return null;
                }

                function checkForPawnPromotions() {
                    // Look for pawns that can promote
                    for (const [pos, piece] of Object.entries(boardState)) {
                        if (piece.color === 'black' && piece.piece === '♟') {
                            const row = pos[1];
                            if (row === '2') { // Pawn reached promotion rank
                                const moves = calculatePossibleMoves('♟', 'black', pos);
                                if (moves.length > 0) {
                                    return {from: pos, to: moves[0].position};
                                }
                            }
                        }
                    }
                    return null;
                }

            // Get AI move from the deep learning API
            async function getAIMoveFromAPI() {
                if (!useAPI) return null;
                
                // Create board representation for the API
                const boardText = generateBoardText();
                
                // Create the prompt
                const prompt = `You are a chess grandmaster. The current board state is:\n\n${boardText}\n\nIt is black's turn. Provide the next move for black in UCI format (e.g., "e7e5"). Only respond with the UCI move and nothing else.`;
                console.log(prompt);

                const url = 'https://chatgpt-42.p.rapidapi.com/deepseekai';
                const options = {
                    method: 'POST',
                    headers: {
                        'x-rapidapi-key': '0b2bd932d3mshc9d3922e8e75d40p1f9239jsn1c1d21dfd9e1',
                        'x-rapidapi-host': 'chatgpt-42.p.rapidapi.com',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        messages: [
                            {
                                role: 'user',
                                content: prompt
                            }
                        ],
                        web_access: true
                    })
                };

                try {
                    const response = await fetch(url, options);
                    const result = await response.json();
                    console.log(result);
                    
                    if(response.status == 429) 
                    {
                        console.log("Deepseek failed");
                        isGemini = true;
                        throw new Error("switch to Gemini");
                    }

                    // Parse the response - expecting UCI format (e.g., "e7e5")
                    if (result.result) {
                        const moveText = result.result.trim();
                        console.log(moveText);
                        if (moveText.length === 4) {
                            const from = moveText.substring(0, 2);
                            const to = moveText.substring(2, 4);
                            return { from, to };
                        }
                    }
                } catch (error) {
                    console.error('API Error:', error);
                    throw error;
                }
                
                return null;
            }
            
            async function getGeminiMoveFromAPI() {
                if (!useAPI) return null;
            
                try {
                    // Create board representation for the API
                    const boardText = generateBoardText();
                    
                    // Create the prompt
                    const prompt = `You are a chess grandmaster. The current board state is:\n\n${boardText}\n\nIt is black's turn. Provide the next move for black in UCI format (e.g., "e7e5"). Only respond with the UCI move and nothing else.`;
                    console.log(prompt);

                    // Wait for the API response
                    const response = await puter.ai.chat(prompt, {
                        model: 'google/gemini-2.5-flash-preview:thinking'
                    });
                    
                    console.log(response.message.content);
                    const result = response.message.content.trim();
                    
                    // Parse the response - expecting UCI format (e.g., "e7e5")
                    if (result.length === 4) {
                        const from = result.substring(0, 2);
                        const to = result.substring(2, 4);
                        return { from, to };
                    }
                    
                    return null;
                } catch (error) {
                    console.error("Error getting AI move:", error);
                    return null;
                }
            }

            // Generate text representation of the board for the API
            function generateBoardText() {
                const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
                let boardText = "   a b c d e f g h\n";
                
                for (let row = 0; row < 8; row++) {
                    boardText += `${8 - row}  `;
                    for (let col = 0; col < 8; col++) {
                        const position = `${letters[col]}${8 - row}`;
                        const piece = boardState[position];
                        
                        if (piece) {
                            let symbol = '';
                            switch(piece.piece) {
                                case '♔': symbol = 'K'; break;
                                case '♚': symbol = 'k'; break;
                                case '♕': symbol = 'Q'; break;
                                case '♛': symbol = 'q'; break;
                                case '♖': symbol = 'R'; break;
                                case '♜': symbol = 'r'; break;
                                case '♗': symbol = 'B'; break;
                                case '♝': symbol = 'b'; break;
                                case '♘': symbol = 'N'; break;
                                case '♞': symbol = 'n'; break;
                                case '♙': symbol = 'P'; break;
                                case '♟': symbol = 'p'; break;
                            }
                            boardText += symbol + ' ';
                        } else {
                            boardText += '. ';
                        }
                    }
                    boardText += `${8 - row}\n`;
                }
                
                boardText += "   a b c d e f g h";
                return boardText;
            }
            
            // Show game over message
            function showGameOver(winner) {
                const message = document.createElement('div');
                message.className = 'victory-message';
                
                if (winner === 'draw') {
                    message.innerHTML = `
                        <h2><i class="fas fa-chess-board"></i> Draw!</h2>
                        <p>The game ended in a stalemate</p>
                        <button class="btn new-game" id="restart-btn">
                            <i class="fas fa-redo"></i> Play Again
                        </button>
                    `;
                } else {
                    const winnerName = winner === 'white' ? 'You Win!' : 'DeepChess AI Wins!';
                    message.innerHTML = `
                        <h2><i class="fas fa-crown"></i> ${winnerName}</h2>
                        <p>${winner === 'white' ? 'Congratulations!' : 'Better luck next time!'}</p>
                        <button class="btn new-game" id="restart-btn">
                            <i class="fas fa-redo"></i> Play Again
                        </button>
                    `;
                }
                
                document.body.appendChild(message);
                
                // Add restart event
                document.getElementById('restart-btn').addEventListener('click', () => {
                    message.remove();
                    document.getElementById('new-game-btn').click();
                });
            }
            
            // Update move log
            function updateMoveLog() {
                movesLog.innerHTML = '';
                
                moveHistory.forEach(entry => {
                    const moveEntry = document.createElement('div');
                    moveEntry.className = 'move-entry';
                    
                    let whiteMove = '';
                    let blackMove = '';
                    
                    if (entry.white) {
                        whiteMove = `${entry.white.piece === '♙' ? '' : entry.white.piece}${entry.white.to}`;
                    }
                    
                    if (entry.black) {
                        blackMove = `${entry.black.piece === '♟' ? '' : entry.black.piece}${entry.black.to}`;
                    }
                    
                    moveEntry.innerHTML = `
                        <span class="move-number">${entry.number}.</span>
                        <span class="move-white">${whiteMove}</span>
                        <span class="move-black">${blackMove}</span>
                    `;
                    
                    movesLog.appendChild(moveEntry);
                });
                
                // Scroll to bottom
                movesLog.scrollTop = movesLog.scrollHeight;

                const toggleAIButton = document.getElementById('toggle-ai-btn');
                const aiModeText = document.getElementById('ai-mode-text');

                if (isDeep) {
                    aiModeText.textContent = 'Deep AI';
                    toggleAIButton.style.background = 'linear-gradient(to right, #4ecca3, #16d9e3)';
                    if(isGemini)
                    {
                        apiStatus.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> AI Engine: Contacting Gemini API';
                    }else
                    {
                        apiStatus.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> AI Engine: Contacting Deep Seek API';
                    }
                } else {
                    aiModeText.textContent = 'Local AI';
                    toggleAIButton.style.background = 'linear-gradient(to right, #8f94fb, #4e54c8)';
                    apiStatus.innerHTML = '<i class="fas fa-microchip"></i> AI Engine: Local';
                }
            }
            
            // Add event listeners for board interaction
            function setupBoardEvents() {
                const squares = document.querySelectorAll('.square');
                
                squares.forEach(square => {
                    square.addEventListener('click', function() {
                        if (gameOver || currentPlayer === 'black') return;
                        
                        const position = this.dataset.position;
                        const piece = this.querySelector('.piece');
                        
                        // If we have a selected piece, try to move it
                        if (selectedPiece) {
                            // Check if we're clicking on a possible move
                            const possibleMove = this.querySelector('.possible-move, .possible-capture');
                            if (possibleMove) {
                                movePiece(selectedPiece.position, position);
                                selectedPiece = null;
                                clearPossibleMoves();
                                return;
                            }
                            
                            // Otherwise, deselect if clicking elsewhere
                            selectedPiece = null;
                            clearPossibleMoves();
                        }
                        
                        // If clicking on a piece of the current player
                        if (piece && piece.dataset.color === currentPlayer) {
                            selectedPiece = {
                                position: position,
                                piece: piece.textContent,
                                color: piece.dataset.color
                            };
                            
                            // Highlight selected square
                            document.querySelectorAll('.square').forEach(sq => {
                                sq.classList.remove('selected');
                            });
                            this.classList.add('selected');
                            
                            // Show possible moves
                            clearPossibleMoves();
                            const possibleMoves = calculatePossibleMoves(
                                piece.textContent, 
                                piece.dataset.color, 
                                position
                            );
                            showPossibleMoves(possibleMoves);
                        }
                    });
                    
                    square.addEventListener('mouseenter', function() {
                        if (!this.classList.contains('selected') && !gameOver) {
                            this.style.backgroundColor = this.classList.contains('white') ? 
                                'rgba(240, 217, 181, 0.7)' : 'rgba(181, 136, 99, 0.7)';
                        }
                    });
                    
                    square.addEventListener('mouseleave', function() {
                        if (!this.classList.contains('selected') && !gameOver) {
                            this.style.backgroundColor = '';
                        }
                    });
                });
            }
            
            // Setup button events
            function setupButtonEvents() {
                document.getElementById('new-game-btn').addEventListener('click', () => {
                    // Reset game state
                    selectedPiece = null;
                    currentPlayer = 'white';
                    moveHistory = [];
                    lastMoveFrom = null;
                    lastMoveTo = null;
                    gameOver = false;
                    whiteKingPos = 'e1';
                    blackKingPos = 'e8';
                    checkState = { white: false, black: false };

                    whiteTime = 10 * 60;
                    blackTime = 10 * 60;
                    stopTimer();
                    updateTimerDisplays();
                    
                    // Clear captured pieces
                    userCaptured.innerHTML = '';
                    aiCaptured.innerHTML = '';
                    
                    // Clear move log
                    movesLog.innerHTML = '';
                    
                    // Reset status
                    statusBar.innerHTML = '<span>New game started. Your turn!</span>';
                    apiStatus.innerHTML = '<i class="fas fa-circle-check"></i> AI Engine: Deep Learning API';
                    
                    // Remove game over message if exists
                    const existingMessage = document.querySelector('.victory-message');
                    if (existingMessage) existingMessage.remove();
                    
                    // Reset board
                    createChessBoard();
                    setupBoardEvents();
                });
                
                document.getElementById('hint-btn').addEventListener('click', () => {
                    if (currentPlayer !== 'white' || gameOver) return;
                    
                    statusBar.innerHTML = '<span>Hint: Try moving a pawn or knight first</span>';
                    
                    // Highlight a suggested move
                    const square = document.querySelector(`.square[data-position="e4"]`);
                    if (square) {
                        const marker = document.createElement('div');
                        marker.className = 'hint-marker';
                        marker.innerHTML = '<i class="fas fa-lightbulb"></i>';
                        square.appendChild(marker);
                        
                        // Remove after 5 seconds
                        setTimeout(() => {
                            marker.remove();
                        }, 5000);
                    }
                });
                
                document.getElementById('undo-btn').addEventListener('click', () => {
                    if (moveHistory.length === 0) return;
                    
                    // For simplicity, just reset the game
                    document.getElementById('new-game-btn').click();
                    statusBar.innerHTML = '<span>Game reset. Your turn!</span>';
                });
                
                // Tool buttons
                document.querySelectorAll('.tool-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        document.querySelectorAll('.tool-btn').forEach(b => {
                            b.classList.remove('active');
                        });
                        this.classList.add('active');
                    });
                });

                const toggleAIButton = document.getElementById('toggle-ai-btn');
                const aiModeText = document.getElementById('ai-mode-text');
                
                toggleAIButton.addEventListener('click', () => {
                    isDeep = !isDeep;
                    if (isDeep) {
                        aiModeText.textContent = 'Deep AI';
                        toggleAIButton.style.background = 'linear-gradient(to right, #4ecca3, #16d9e3)';
                        apiStatus.innerHTML = '<i class="fas fa-circle-check"></i> AI Engine: Deep Learning API';
                    } else {
                        aiModeText.textContent = 'Local AI';
                        toggleAIButton.style.background = 'linear-gradient(to right, #8f94fb, #4e54c8)';
                        apiStatus.innerHTML = '<i class="fas fa-microchip"></i> AI Engine: Local';
                    }
                });
            }
        });