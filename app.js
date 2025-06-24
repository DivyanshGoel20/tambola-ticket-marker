const uploader = document.getElementById('uploader');
const container = document.getElementById('container');
const ticketImg = document.getElementById('ticket-img');
const canvas = document.getElementById('marker-canvas');
const ctx = canvas.getContext('2d');
const saveBtn = document.getElementById('save-btn');

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

// Save marks to localStorage
function saveMarks() {
  localStorage.setItem('tambola_marks', JSON.stringify(marks));
  alert('Marks saved!');
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
    saveBtn.style.display = 'inline-block';
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

// Save button
saveBtn.addEventListener('click', saveMarks); 