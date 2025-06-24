const uploader = document.getElementById('uploader');
const container = document.getElementById('container');
const ticketImg = document.getElementById('ticket-img');
const canvas = document.getElementById('marker-canvas');
const ctx = canvas.getContext('2d');

// Store marks as array of {x, y}
let marks = [];
const MARK_RADIUS = 18; // px
const MARK_COLOR = 'rgba(231, 76, 60, 0.85)';

// Load marks from localStorage if available
function loadMarks() {
  const data = localStorage.getItem('tambola_marks');
  if (data) {
    marks = JSON.parse(data);
    drawMarks();
  }
}

// Draw all marks
function drawMarks() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  marks.forEach(({x, y}) => {
    ctx.beginPath();
    ctx.arc(x, y, MARK_RADIUS, 0, 2 * Math.PI);
    ctx.strokeStyle = MARK_COLOR;
    ctx.lineWidth = 4;
    ctx.stroke();
    // Draw X
    ctx.beginPath();
    ctx.moveTo(x - MARK_RADIUS/1.5, y - MARK_RADIUS/1.5);
    ctx.lineTo(x + MARK_RADIUS/1.5, y + MARK_RADIUS/1.5);
    ctx.moveTo(x + MARK_RADIUS/1.5, y - MARK_RADIUS/1.5);
    ctx.lineTo(x - MARK_RADIUS/1.5, y + MARK_RADIUS/1.5);
    ctx.strokeStyle = MARK_COLOR;
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}

// Find if a mark exists near (x, y)
function findMark(x, y) {
  return marks.findIndex(m => Math.hypot(m.x - x, m.y - y) < MARK_RADIUS);
}

// Handle canvas click
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left);
  const y = (e.clientY - rect.top);
  const idx = findMark(x, y);
  if (idx >= 0) {
    marks.splice(idx, 1); // Unmark
  } else {
    marks.push({x, y}); // Mark
  }
  drawMarks();
});

// Handle image upload
uploader.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    ticketImg.src = ev.target.result;
    container.style.display = 'inline-block';
    marks = [];
    localStorage.removeItem('tambola_marks');
  };
  reader.readAsDataURL(file);
});

// When image loads, resize canvas
ticketImg.onload = function() {
  canvas.width = ticketImg.width;
  canvas.height = ticketImg.height;
  canvas.style.width = ticketImg.width + 'px';
  canvas.style.height = ticketImg.height + 'px';
  canvas.style.pointerEvents = 'auto';
  drawMarks();
  loadMarks();
};

// --- Firebase Config & Initialization (replace with your config) ---
// Add your Firebase config here
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
// Initialize Firebase
if (typeof firebase === 'undefined') {
  const script = document.createElement('script');
  script.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js';
  script.onload = () => {
    const dbScript = document.createElement('script');
    dbScript.src = 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore-compat.js';
    dbScript.onload = () => {
      firebase.initializeApp(firebaseConfig);
      window.db = firebase.firestore();
    };
    document.head.appendChild(dbScript);
  };
  document.head.appendChild(script);
} else {
  firebase.initializeApp(firebaseConfig);
  window.db = firebase.firestore();
}

// --- Game Hosting/Joining Logic ---
const hostBtn = document.getElementById('host-btn');
const joinBtn = document.getElementById('join-btn');
const joinSection = document.getElementById('join-section');
const submitJoin = document.getElementById('submit-join');
const joinCodeInput = document.getElementById('join-code');
const lobby = document.getElementById('lobby');
const lobbyTitle = document.getElementById('lobby-title');
const playersList = document.getElementById('players-list');
const startGameBtn = document.getElementById('start-game');
const waitingMsg = document.getElementById('waiting-msg');

let currentGameCode = null;
let isHost = false;
let playerName = "Player" + Math.floor(Math.random() * 10000);

hostBtn.onclick = async () => {
  isHost = true;
  currentGameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  // Create game in Firestore
  if (window.db) {
    await window.db.collection('games').doc(currentGameCode).set({
      host: playerName,
      started: false,
      players: [playerName]
    });
  }
  showLobby();
};

joinBtn.onclick = () => {
  joinSection.style.display = 'flex';
};

submitJoin.onclick = async () => {
  const code = joinCodeInput.value.trim().toUpperCase();
  if (!code) return;
  currentGameCode = code;
  isHost = false;
  // Add player to game in Firestore
  if (window.db) {
    const gameRef = window.db.collection('games').doc(currentGameCode);
    const gameDoc = await gameRef.get();
    if (gameDoc.exists) {
      await gameRef.update({
        players: firebase.firestore.FieldValue.arrayUnion(playerName)
      });
      showLobby();
    } else {
      alert('Game not found!');
    }
  }
};

function showLobby() {
  document.getElementById('game-options').style.display = 'none';
  joinSection.style.display = 'none';
  lobby.style.display = 'block';
  lobbyTitle.textContent = isHost ? `Game Code: ${currentGameCode}` : `Joined Game: ${currentGameCode}`;
  startGameBtn.style.display = isHost ? 'inline-block' : 'none';
  waitingMsg.style.display = isHost ? 'none' : 'block';
  updatePlayersList();
}

async function updatePlayersList() {
  if (!window.db || !currentGameCode) return;
  const gameRef = window.db.collection('games').doc(currentGameCode);
  gameRef.onSnapshot(doc => {
    if (doc.exists) {
      const data = doc.data();
      playersList.innerHTML = '';
      (data.players || []).forEach(p => {
        const div = document.createElement('div');
        div.textContent = p;
        playersList.appendChild(div);
      });
      if (data.started && !isHost) {
        waitingMsg.textContent = 'Game started!';
        // TODO: Transition to game screen
      }
    }
  });
}

startGameBtn.onclick = async () => {
  if (!window.db || !currentGameCode) return;
  await window.db.collection('games').doc(currentGameCode).update({ started: true });
  // TODO: Transition to game screen for host
}; 