// Tic Tac Toe Main JavaScript Application
const TicTac = (function() {
    'use strict';

    // Firebase Configuration
    const firebaseConfig = {
        apiKey: "AIzaSyCyp5vJR3-T9ffY48LMB39EqlAmvj5bVtE",
        authDomain: "blazecode93.firebaseapp.com",
        databaseURL: "https://blazecode93-default-rtdb.firebaseio.com",
        projectId: "blazecode93",
        storageBucket: "blazecode93.firebasestorage.app",
        messagingSenderId: "730429394253",
        appId: "1:730429394253:web:e48b4d00284302a811fb04",
        measurementId: "G-9QNXQC0D76"
    };

    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const database = firebase.database();
    const firestore = firebase.firestore();
    const storage = firebase.storage();

    // Application State
    let currentUser = null;
    let authInitialized = false;
    let currentGame = null;
    let gameRef = null;
    let gameChatRef = null;

    // Utility Functions
    const utils = {
        generateRoomId: function() {
            return Math.random().toString(36).substring(2, 10).toUpperCase();
        },
        
        generateGuestName: function() {
            return `Guest_${Math.floor(Math.random() * 9999)}`;
        },
        
        showToast: function(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            
            setTimeout(() => {
                toast.classList.add('show');
            }, 100);
            
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(toast);
                }, 300);
            }, 3000);
        },
        
        formatDate: function(date) {
            if (!date) return 'Never';
            if (date.seconds) {
                return new Date(date.seconds * 1000).toLocaleDateString();
            }
            return new Date(date).toLocaleDateString();
        },
        
        calculateLevel: function(xp) {
            let level = 1;
            let xpNeeded = 150;
            let currentXp = xp || 0;
            while (currentXp >= xpNeeded) {
                currentXp -= xpNeeded;
                level++;
                xpNeeded = 100 + level * 50;
            }
            return { level, xpLeft: currentXp, xpNeeded };
        },
        
        copyToClipboard: function(text) {
            navigator.clipboard.writeText(text).then(() => {
                utils.showToast('Link copied to clipboard!', 'success');
            }).catch(() => {
                utils.showToast('Failed to copy link', 'error');
            });
        }
    };

    // Authentication Module
    const Auth = {
        init: function() {
            auth.onAuthStateChanged((user) => {
                currentUser = user;
                authInitialized = true;
                
                if (user) {
                    this.loadUserProfile();
                }
                
                // Handle redirects based on current page
                this.handlePageRedirects();
            });
        },

        handlePageRedirects: function() {
            const currentPath = window.location.pathname;
            
            if (currentUser) {
                // User is logged in
                if (currentPath.includes('login.html') || 
                    currentPath.includes('signup.html') || 
                    currentPath.includes('index.html')) {
                    window.location.href = 'dashboard.html';
                }
            } else {
                // User is not logged in
                if (!currentPath.includes('index.html') && 
                    !currentPath.includes('login.html') && 
                    !currentPath.includes('signup.html')) {
                    window.location.href = 'index.html';
                }
            }
        },

        checkAuth: function() {
            if (!authInitialized) {
                setTimeout(() => this.checkAuth(), 100);
                return;
            }
            
            if (!currentUser && !window.location.pathname.includes('index.html')) {
                window.location.href = 'index.html';
            }
        },

        loadUserProfile: function() {
            if (currentUser) {
                firestore.collection('users').doc(currentUser.uid).get()
                    .then((doc) => {
                        if (doc.exists) {
                            const userData = doc.data();
                            currentUser.profile = userData;
                            this.updateUIWithProfile(userData);
                        } else {
                            // Create user profile if it doesn't exist
                            this.createUserProfile();
                        }
                    })
                    .catch((error) => {
                        console.error('Error loading user profile:', error);
                    });
            }
        },

        createUserProfile: function() {
            if (currentUser) {
                const username = currentUser.email ? 
                    currentUser.email.split('@')[0] : 
                    utils.generateGuestName();
                
                const userData = {
                    username: username,
                    email: currentUser.email || '',
                    avatarUrl: 'assets/default-avatar.png',
                    xp: 0,
                    level: 1,
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    status: 'online',
                    lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                firestore.collection('users').doc(currentUser.uid).set(userData)
                    .then(() => {
                        currentUser.profile = userData;
                        this.updateUIWithProfile(userData);
                    })
                    .catch((error) => {
                        console.error('Error creating user profile:', error);
                    });
            }
        },

        updateUIWithProfile: function(userData) {
            // Update all avatar elements
            const avatarElements = document.querySelectorAll('#userAvatar, #menuAvatar, #currentAvatar, #profileAvatar');
            avatarElements.forEach(el => {
                if (el && userData.avatarUrl) {
                    el.src = userData.avatarUrl;
                }
            });
            
            // Update username elements
            const usernameElements = document.querySelectorAll('#username, #menuUsername, #profileUsername');
            usernameElements.forEach(el => {
                if (el) {
                    el.textContent = userData.username || 'User';
                }
            });
            
            // Update XP bar
            const xpProgress = document.getElementById('xpProgress');
            const xpText = document.getElementById('xpText');
            const profileXpProgress = document.getElementById('profileXpProgress');
            const profileXpText = document.getElementById('profileXpText');
            
            if (xpProgress && xpText) {
                const { level, xpLeft, xpNeeded } = utils.calculateLevel(userData.xp);
                xpProgress.style.width = `${(xpLeft / xpNeeded) * 100}%`;
                xpText.textContent = `Level ${level} (${xpLeft}/${xpNeeded} XP)`;
            }
            
            if (profileXpProgress && profileXpText) {
                const { level, xpLeft, xpNeeded } = utils.calculateLevel(userData.xp);
                profileXpProgress.style.width = `${(xpLeft / xpNeeded) * 100}%`;
                profileXpText.textContent = `Level ${level} (${xpLeft}/${xpNeeded} XP)`;
            }
        },

        login: function(email, password) {
            auth.signInWithEmailAndPassword(email, password)
                .then(() => {
                    utils.showToast('Login successful!', 'success');
                })
                .catch((error) => {
                    utils.showToast(`Login failed: ${error.message}`, 'error');
                });
        },

        signup: function(username, email, password) {
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    // Create user profile
                    const userData = {
                        username: username,
                        email: email,
                        avatarUrl: 'assets/default-avatar.png',
                        xp: 0,
                        level: 1,
                        wins: 0,
                        losses: 0,
                        draws: 0,
                        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        status: 'online',
                        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    return firestore.collection('users').doc(user.uid).set(userData);
                })
                .then(() => {
                    utils.showToast('Account created successfully!', 'success');
                })
                .catch((error) => {
                    utils.showToast(`Signup failed: ${error.message}`, 'error');
                });
        },

        logout: function() {
            auth.signOut()
                .then(() => {
                    utils.showToast('Logged out successfully', 'success');
                    window.location.href = 'index.html';
                })
                .catch((error) => {
                    utils.showToast(`Logout failed: ${error.message}`, 'error');
                });
        },

        guestLogin: function() {
            auth.signInAnonymously()
                .then(() => {
                    utils.showToast('Guest login successful!', 'success');
                })
                .catch((error) => {
                    utils.showToast(`Guest login failed: ${error.message}`, 'error');
                });
        }
    };

    // Matchmaking Module
    const Matchmaking = {
        quickMatch: function() {
            if (!currentUser) {
                utils.showToast('Please login first', 'error');
                return;
            }
            
            utils.showToast('Looking for opponent...', 'info');
            
            // Use a single room for all quick matches
            const quickMatchRoom = 'GLOBAL_QUICK_MATCH';
            const gameRef = database.ref(`games/${quickMatchRoom}`);
            
            // Use transaction to ensure atomic operation
            gameRef.transaction((currentGame) => {
                if (!currentGame) {
                    // Create new game with player X
                    return {
                        players: {
                            X: {
                                uid: currentUser.uid,
                                name: currentUser.profile.username
                            }
                        },
                        board: Array(9).fill(''),
                        turn: 'X',
                        status: 'waiting',
                        createdAt: firebase.database.ServerValue.TIMESTAMP,
                        moveHistory: []
                    };
                } else if (currentGame.status === 'waiting' && !currentGame.players.O) {
                    // Join as player O
                    currentGame.players.O = {
                        uid: currentUser.uid,
                        name: currentUser.profile.username
                    };
                    currentGame.status = 'playing';
                    currentGame.turn = 'X'; // X always goes first
                    return currentGame;
                }
                // If game is already full, return null (no change)
                return currentGame; // Keep existing game unchanged
            }, (error, committed, snapshot) => {
                if (error) {
                    utils.showToast('Matchmaking failed', 'error');
                } else if (committed) {
                    // Successfully joined or created game
                    window.location.href = `play.html?room=${quickMatchRoom}`;
                } else {
                    // Game was already full, try again in a moment
                    setTimeout(() => {
                        this.quickMatch(); // Recursive call to try again
                    }, 500);
                }
            }, true); // Include priority in transaction
        },

        createRoom: function() {
            if (!currentUser) {
                utils.showToast('Please login first', 'error');
                return;
            }
            
            const roomId = utils.generateRoomId();
            window.location.href = `play.html?room=${roomId}`;
        },

        shareRoom: function() {
            const currentUrl = window.location.href;
            utils.copyToClipboard(currentUrl);
        }
    };

    // Game Engine Module
    const GameEngine = {
        currentRoom: null,
        gameRef: null,
        chatRef: null,

        init: function() {
            const urlParams = new URLSearchParams(window.location.search);
            this.currentRoom = urlParams.get('room');
            
            if (!this.currentRoom) {
                // Create new room if none provided
                this.currentRoom = utils.generateRoomId();
                window.history.replaceState({}, '', `play.html?room=${this.currentRoom}`);
            }
            
            this.gameRef = database.ref(`games/${this.currentRoom}`);
            this.chatRef = database.ref(`gameChats/${this.currentRoom}`);
            
            this.setupGameBoard();
            this.listenForGameState();
            this.loadChatMessages();
            
            // Set up event listeners
            document.getElementById('sendChatBtn')?.addEventListener('click', () => this.sendMessage());
            document.getElementById('chatInput')?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendMessage();
            });
            document.getElementById('quitGameBtn')?.addEventListener('click', () => this.quitGame());
            document.getElementById('shareRoomBtn')?.addEventListener('click', () => Matchmaking.shareRoom());
        },

        setupGameBoard: function() {
            const cells = document.querySelectorAll('.cell');
            cells.forEach((cell, index) => {
                cell.addEventListener('click', () => this.handleCellClick(index));
            });
        },

        handleCellClick: function(index) {
            if (!currentUser) return;
            if (!this.currentGame) return;
            
            const cell = document.querySelector(`[data-index="${index}"]`);
            if (cell.textContent !== '' || this.currentGame.status !== 'playing') return;
            
            // Check if it's current player's turn
            let playerSymbol = null;
            if (this.currentGame.players?.X?.uid === currentUser.uid) playerSymbol = 'X';
            else if (this.currentGame.players?.O?.uid === currentUser.uid) playerSymbol = 'O';
            
            if (!playerSymbol || this.currentGame.turn !== playerSymbol) {
                utils.showToast('Not your turn!', 'error');
                return;
            }
            
            this.makeMove(index, playerSymbol);
        },

        makeMove: function(index, symbol) {
            this.gameRef.transaction((game) => {
                if (!game || game.status !== 'playing' || game.board[index] !== '') {
                    return; // Invalid move
                }
                
                game.board[index] = symbol;
                game.turn = symbol === 'X' ? 'O' : 'X';
                
                // Check for winner
                const winner = this.checkWinner(game.board);
                if (winner === 'X' || winner === 'O') {
                    game.status = 'finished';
                    game.winner = winner;
                    // Update player stats
                    this.updatePlayerStats(winner);
                } else if (winner === 'draw') {
                    game.status = 'finished';
                    game.winner = 'draw';
                    // Update player stats for draw
                    this.updatePlayerStats(null);
                }
                
                return game;
            });
        },

        updatePlayerStats: function(winner) {
            if (!currentUser) return;
            
            const userRef = firestore.collection('users').doc(currentUser.uid);
            let increment = 5; // Default for loss
            
            if (winner === null) increment = 10; // Draw
            else if (winner === 'X' && currentGame.players.X.uid === currentUser.uid) increment = 20; // Win
            else if (winner === 'O' && currentGame.players.O.uid === currentUser.uid) increment = 20; // Win
            
            userRef.update({
                xp: firebase.firestore.FieldValue.increment(increment),
                wins: winner && ((winner === 'X' && currentGame.players.X.uid === currentUser.uid) || 
                                (winner === 'O' && currentGame.players.O.uid === currentUser.uid)) ? 
                                firebase.firestore.FieldValue.increment(1) : firebase.firestore.FieldValue.increment(0),
                losses: winner && winner !== 'draw' && 
                        ((winner === 'X' && currentGame.players.O.uid === currentUser.uid) || 
                         (winner === 'O' && currentGame.players.X.uid === currentUser.uid)) ? 
                        firebase.firestore.FieldValue.increment(1) : firebase.firestore.FieldValue.increment(0),
                draws: winner === 'draw' ? firebase.firestore.FieldValue.increment(1) : firebase.firestore.FieldValue.increment(0)
            });
        },

        checkWinner: function(board) {
            const patterns = [
                [0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]
            ];
            
            for (let pattern of patterns) {
                const [a,b,c] = pattern;
                if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                    return board[a];
                }
            }
            
            if (board.every(cell => cell !== '')) {
                return 'draw';
            }
            
            return null;
        },

        listenForGameState: function() {
            this.gameRef.on('value', (snapshot) => {
                const gameData = snapshot.val();
                if (!gameData) {
                    // Initialize new game
                    this.initializeNewGame();
                    return;
                }
                
                this.currentGame = gameData;
                this.updateGameUI(gameData);
            });
        },

        initializeNewGame: function() {
            if (!currentUser) return;
            
            const newGame = {
                players: {
                    X: {
                        uid: currentUser.uid,
                        name: currentUser.profile.username
                    }
                },
                board: Array(9).fill(''),
                turn: 'X',
                status: 'waiting',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                moveHistory: []
            };
            
            this.gameRef.set(newGame);
        },

        updateGameUI: function(gameData) {
            // Update board
            const cells = document.querySelectorAll('.cell');
            gameData.board.forEach((value, index) => {
                if (value === 'X') {
                    cells[index].innerHTML = '<span class="x">X</span>';
                    cells[index].classList.add('x');
                } else if (value === 'O') {
                    cells[index].innerHTML = '<span class="o">O</span>';
                    cells[index].classList.add('o');
                } else {
                    cells[index].innerHTML = '';
                    cells[index].classList.remove('x', 'o');
                }
                
                // Block cell if game is finished or cell is occupied
                if (gameData.status === 'finished' || value !== '') {
                    cells[index].style.pointerEvents = 'none';
                    cells[index].style.opacity = gameData.status === 'finished' ? '0.7' : '1';
                } else {
                    cells[index].style.pointerEvents = 'auto';
                    cells[index].style.opacity = '1';
                }
            });
            
            // Update player info
            if (gameData.players?.X) {
                document.getElementById('playerXName').textContent = gameData.players.X.name;
                document.getElementById('playerXStatus').textContent = 'Ready';
            }
            if (gameData.players?.O) {
                document.getElementById('playerOName').textContent = gameData.players.O.name;
                document.getElementById('playerOStatus').textContent = 'Ready';
            } else {
                document.getElementById('playerOStatus').textContent = 'Waiting...';
            }
            
            // Update game status
            let statusText = 'Waiting for opponent...';
            if (gameData.status === 'playing') {
                statusText = gameData.turn === 'X' ? 'X\'s Turn' : 'O\'s Turn';
            } else if (gameData.status === 'finished') {
                if (gameData.winner === 'draw') {
                    statusText = 'Game Draw!';
                } else {
                    statusText = `${gameData.winner} Wins!`;
                }
            }
            document.getElementById('gameStatus').textContent = statusText;
            
            // Update room ID
            document.getElementById('gameRoom').textContent = `#${this.currentRoom}`;
            
            // Enable share button if game is ready
            const shareBtn = document.getElementById('shareRoomBtn');
            if (shareBtn && gameData.status !== 'waiting') {
                shareBtn.style.display = 'block';
            }
            
            // Load second player if not present
            if (gameData.status === 'waiting' && !gameData.players?.O && currentUser.uid !== gameData.players?.X?.uid) {
                // Join as O player
                this.gameRef.update({
                    'players/O': {
                        uid: currentUser.uid,
                        name: currentUser.profile.username
                    },
                    status: 'playing',
                    'turn': 'X' // X goes first
                });
            }
        },

        loadChatMessages: function() {
            const messagesContainer = document.getElementById('chatMessages');
            if (!messagesContainer) return;
            
            // Load existing messages
            this.chatRef.limitToLast(50).once('value')
                .then((snapshot) => {
                    messagesContainer.innerHTML = '';
                    snapshot.forEach((child) => {
                        this.addGameChatMessage(child.val());
                    });
                });
            
            // Listen for new messages
            this.chatRef.limitToLast(1).on('child_added', (snapshot) => {
                this.addGameChatMessage(snapshot.val());
            });
        },

        addGameChatMessage: function(message) {
            const messagesContainer = document.getElementById('chatMessages');
            if (!messagesContainer) return;
            
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message';
            if (message.uid === currentUser?.uid) {
                messageElement.classList.add('own');
            }
            
            messageElement.innerHTML = `
                <img src="${message.avatar || 'assets/default-avatar.png'}" alt="Avatar" class="avatar">
                <div class="message-content">
                    <div class="message-sender">${message.username}</div>
                    <div class="message-text">${message.message}</div>
                    <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
                </div>
            `;
            
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        },

        sendMessage: function() {
            if (!currentUser || !this.chatRef) return;
            
            const input = document.getElementById('chatInput');
            const message = input.value.trim();
            
            if (!message) return;
            if (message.length > 200) {
                utils.showToast('Message too long', 'error');
                return;
            }
            
            const chatMessage = {
                uid: currentUser.uid,
                username: currentUser.profile.username,
                avatar: currentUser.profile.avatarUrl,
                message: message,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            
            this.chatRef.push(chatMessage);
            input.value = '';
        },

        quitGame: function() {
            window.location.href = 'dashboard.html';
        }
    };

    // Chat Module
    const Chat = {
        initGlobal: function() {
            const messagesContainer = document.getElementById('globalChatMessages');
            if (!messagesContainer) return;
            
            messagesContainer.innerHTML = '<div class="loading-skeleton"><div class="skeleton-message"></div></div>';
            
            // Load last 20 messages
            database.ref('chat/lobby')
                .limitToLast(20)
                .once('value')
                .then((snapshot) => {
                    messagesContainer.innerHTML = '';
                    snapshot.forEach((child) => {
                        this.addMessageToUI(child.val());
                    });
                    messagesContainer.scrollTop = messagesContainer.scrollHeight;
                });
            
            // Listen for new messages
            database.ref('chat/lobby')
                .limitToLast(1)
                .on('child_added', (snapshot) => {
                    this.addMessageToUI(snapshot.val());
                });
                
            // Set up event listeners
            document.getElementById('sendGlobalChatBtn')?.addEventListener('click', () => this.sendGlobalMessage());
            document.getElementById('globalChatInput')?.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.sendGlobalMessage();
            });
        },

        sendGlobalMessage: function() {
            if (!currentUser) {
                utils.showToast('Please login first', 'error');
                return;
            }
            
            const input = document.getElementById('globalChatInput');
            const message = input.value.trim();
            
            if (!message) return;
            if (message.length > 200) {
                utils.showToast('Message too long', 'error');
                return;
            }
            
            const chatMessage = {
                uid: currentUser.uid,
                username: currentUser.profile.username,
                avatar: currentUser.profile.avatarUrl,
                message: message,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };
            
            database.ref('chat/lobby').push(chatMessage);
            input.value = '';
        },

        addMessageToUI: function(message) {
            const messagesContainer = document.getElementById('globalChatMessages');
            if (!messagesContainer) return;
            
            const messageElement = document.createElement('div');
            messageElement.className = 'chat-message';
            if (message.uid === currentUser?.uid) {
                messageElement.classList.add('own');
            }
            
            messageElement.innerHTML = `
                <img src="${message.avatar || 'assets/default-avatar.png'}" alt="Avatar" class="avatar">
                <div class="message-content">
                    <div class="message-sender">${message.username}</div>
                    <div class="message-text">${message.message}</div>
                    <div class="message-time">${new Date(message.timestamp).toLocaleTimeString()}</div>
                </div>
            `;
            
            messagesContainer.appendChild(messageElement);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    };

    // Leaderboard Module
    const Leaderboard = {
        init: function() {
            this.loadLeaderboard();
        },

        loadLeaderboard: function() {
            const rankingsList = document.getElementById('rankingsList');
            if (!rankingsList) return;
            
            rankingsList.innerHTML = '<div class="loading-skeleton"><div class="skeleton-item"></div></div>';
            
            // Get top 10 users by wins
            firestore.collection('users')
                .orderBy('wins', 'desc')
                .orderBy('xp', 'desc')
                .limit(10)
                .get()
                .then((snapshot) => {
                    rankingsList.innerHTML = '';
                    snapshot.forEach((doc, index) => {
                        const data = doc.data();
                        const rankingItem = document.createElement('div');
                        rankingItem.className = 'ranking-item';
                        rankingItem.innerHTML = `
                            <div class="ranking-number">${index + 1}</div>
                            <img src="${data.avatarUrl || 'assets/default-avatar.png'}" alt="Player" class="ranking-avatar">
                            <div class="ranking-info">
                                <div class="ranking-username">${data.username}</div>
                                <div class="ranking-stats">Level ${data.level || 1} • ${data.wins || 0}W ${data.losses || 0}L ${data.draws || 0}D</div>
                            </div>
                        `;
                        rankingsList.appendChild(rankingItem);
                    });
                })
                .catch((error) => {
                    rankingsList.innerHTML = '<p class="text-center">Failed to load leaderboard</p>';
                    console.error('Leaderboard error:', error);
                });
        }
    };

    // Profile Module
    const Profile = {
        init: function() {
            if (!authInitialized) {
                setTimeout(() => this.init(), 100);
                return;
            }
            
            const urlParams = new URLSearchParams(window.location.search);
            const targetUid = urlParams.get('uid');
            
            if (targetUid && targetUid !== currentUser?.uid) {
                // Viewing another user
                this.loadProfile(targetUid);
            } else if (currentUser) {
                // Viewing own profile
                this.loadProfile(currentUser.uid);
                const editBtn = document.getElementById('editProfileBtn');
                if (editBtn) editBtn.style.display = 'block';
            }
        },

        initEdit: function() {
            if (!authInitialized) {
                setTimeout(() => this.initEdit(), 100);
                return;
            }
            
            if (!currentUser) return;
            
            firestore.collection('users').doc(currentUser.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        document.getElementById('editUsername').value = data.username || '';
                        document.getElementById('bio').value = data.bio || '';
                        document.getElementById('currentAvatar').src = data.avatarUrl || 'assets/default-avatar.png';
                        document.getElementById('removeAvatarBtn').style.display = data.avatarUrl && !data.avatarUrl.includes('default-avatar.png') ? 'block' : 'none';
                    }
                });
        },

        loadProfile: function(uid) {
            firestore.collection('users').doc(uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        const data = doc.data();
                        document.getElementById('profileUsername').textContent = data.username || 'User';
                        document.getElementById('profileBio').textContent = data.bio || 'No bio available';
                        document.getElementById('profileAvatar').src = data.avatarUrl || 'assets/default-avatar.png';
                        
                        const { level, xpLeft, xpNeeded } = utils.calculateLevel(data.xp);
                        document.getElementById('profileXpProgress').style.width = `${(xpLeft / xpNeeded) * 100}%`;
                        document.getElementById('profileXpText').textContent = `Level ${level} (${xpLeft}/${xpNeeded} XP)`;
                        
                        document.getElementById('levelStat').textContent = level;
                        document.getElementById('winsStat').textContent = data.wins || 0;
                        document.getElementById('lossesStat').textContent = data.losses || 0;
                        document.getElementById('drawsStat').textContent = data.draws || 0;
                        document.getElementById('joinedDate').textContent = utils.formatDate(data.joinedAt);
                        document.getElementById('lastActive').textContent = utils.formatDate(data.lastSeen);
                    }
                });
        },

        saveProfile: function() {
            if (!currentUser) return;
            
            const username = document.getElementById('editUsername').value;
            const bio = document.getElementById('bio').value;
            
            firestore.collection('users').doc(currentUser.uid).update({
                username: username,
                bio: bio
            }).then(() => {
                utils.showToast('Profile updated!', 'success');
                window.location.href = 'profile.html';
            }).catch((error) => {
                utils.showToast(`Update failed: ${error.message}`, 'error');
            });
        }
    };

    // Cloudinary Module
    const Cloudinary = {
        handleAvatarUpload: function(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            if (!file.type.startsWith('image/')) {
                utils.showToast('Please select an image file', 'error');
                return;
            }
            
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', 'ecoeats');
            formData.append('folder', 'ecoeats');
            
            fetch('https://api.cloudinary.com/v1_1/dc2v84v36/image/upload', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                if (data.secure_url && currentUser) {
                    firestore.collection('users').doc(currentUser.uid).update({
                        avatarUrl: data.secure_url
                    }).then(() => {
                        utils.showToast('Avatar updated!', 'success');
                        document.getElementById('currentAvatar').src = data.secure_url;
                        
                        // Update all avatar elements
                        const avatarElements = document.querySelectorAll('#userAvatar, #menuAvatar, #profileAvatar');
                        avatarElements.forEach(el => {
                            if (el) el.src = data.secure_url;
                        });
                        
                        // Show remove button
                        document.getElementById('removeAvatarBtn').style.display = 'block';
                    });
                }
            })
            .catch(error => {
                utils.showToast('Upload failed', 'error');
            });
        },

        removeAvatar: function() {
            if (!currentUser) return;
            
            firestore.collection('users').doc(currentUser.uid).update({
                avatarUrl: 'assets/default-avatar.png'
            }).then(() => {
                utils.showToast('Avatar removed', 'success');
                document.getElementById('currentAvatar').src = 'assets/default-avatar.png';
                
                // Update all avatar elements
                const avatarElements = document.querySelectorAll('#userAvatar, #menuAvatar, #profileAvatar');
                avatarElements.forEach(el => {
                    if (el) el.src = 'assets/default-avatar.png';
                });
                
                // Hide remove button
                document.getElementById('removeAvatarBtn').style.display = 'none';
            });
        }
    };

    // Settings Module
    const Settings = {
        init: function() {
            // Load settings from localStorage
            const gameInvites = localStorage.getItem('gameInvites') !== 'false';
            const chatMessages = localStorage.getItem('chatMessages') !== 'false';
            const friendRequests = localStorage.getItem('friendRequests') !== 'false';
            const soundEffects = localStorage.getItem('soundEffects') !== 'false';
            const vibration = localStorage.getItem('vibration') !== 'false';
            
            document.getElementById('gameInvitesToggle').checked = gameInvites;
            document.getElementById('chatMessagesToggle').checked = chatMessages;
            document.getElementById('friendRequestsToggle').checked = friendRequests;
            document.getElementById('soundEffectsToggle').checked = soundEffects;
            document.getElementById('vibrationToggle').checked = vibration;
            
            // Add event listeners
            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    localStorage.setItem(e.target.id.replace('Toggle', ''), e.target.checked);
                });
            });
        }
    };

    // UI Module
    const UI = {
        init: function() {
            // Initialize global event listeners
            this.setupGlobalListeners();
        },

        setupGlobalListeners: function() {
            // Handle navigation active states
            if (document.querySelector('.bottom-nav')) {
                const currentPath = window.location.pathname.split('/').pop();
                const navItems = document.querySelectorAll('.nav-item');
                
                navItems.forEach(item => {
                    const href = item.getAttribute('href');
                    if (href && href.includes(currentPath)) {
                        item.classList.add('active');
                    } else {
                        item.classList.remove('active');
                    }
                });
            }
        },

        toggleMenu: function() {
            const overlay = document.getElementById('menuOverlay');
            if (overlay) {
                overlay.classList.add('active');
            }
        },

        closeMenu: function() {
            const overlay = document.getElementById('menuOverlay');
            if (overlay) {
                overlay.classList.remove('active');
            }
        },

        loadDashboard: function() {
            if (!currentUser) return;
            
            // Load user stats
            Auth.loadUserProfile();
        }
    };

    // Initialize on load
    document.addEventListener('DOMContentLoaded', function() {
        Auth.init();
        UI.init();
    });

    // Return public API
    return {
        Auth: Auth,
        UI: UI,
        Matchmaking: Matchmaking,
        GameEngine: GameEngine,
        Chat: Chat,
        Leaderboard: Leaderboard,
        Profile: Profile,
        Cloudinary: Cloudinary,
        Settings: Settings,
        utils: utils
    };
})();