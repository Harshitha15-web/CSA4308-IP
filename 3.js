const $ = (id) => document.getElementById(id);
const STORAGE = { users: 'busgo_users', current: 'busgo_current', buses: 'busgo_buses', bookings: 'busgo_bookings', comments: 'busgo_comments' };
const today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset()); $('journey-date').min = today.toISOString().slice(0,10); $('journey-date').value = today.toISOString().slice(0,10);

const starterBuses = [
  {id:'b1',operator:'GreenLine Travels',from:'Chennai',to:'Bengaluru',depart:'21:30',arrive:'05:45',type:'AC Sleeper',fare:850,seats:24},
  {id:'b2',operator:'Southern Express',from:'Chennai',to:'Bengaluru',depart:'22:15',arrive:'06:00',type:'Volvo AC',fare:1100,seats:30},
  {id:'b3',operator:'CityRide',from:'Chennai',to:'Hyderabad',depart:'19:00',arrive:'07:30',type:'AC Sleeper',fare:1250,seats:24},
  {id:'b4',operator:'Orange Roadways',from:'Bengaluru',to:'Hyderabad',depart:'20:45',arrive:'06:30',type:'Non-AC Seater',fare:650,seats:32},
  {id:'b5',operator:'Coastal Connect',from:'Chennai',to:'Vijayawada',depart:'20:00',arrive:'05:15',type:'Volvo AC',fare:950,seats:28},
  {id:'b6',operator:'HillWay Travels',from:'Coimbatore',to:'Chennai',depart:'21:00',arrive:'06:00',type:'AC Sleeper',fare:780,seats:24},
  {id:'b7',operator:'Rayalaseema Bus',from:'Tirupati',to:'Nellore',depart:'08:00',arrive:'11:30',type:'Non-AC Seater',fare:350,seats:32}
];
function read(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } }
function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function getBuses() { let buses = read(STORAGE.buses, null); if (!buses) { buses = starterBuses; save(STORAGE.buses, buses); } return buses; }
function getBookings() { return read(STORAGE.bookings, []); }
function getComments() { return read(STORAGE.comments, []); }
function currentUser() { return read(STORAGE.current, null); }
let activeBus = null, selectedSeats = [], authMode = 'login', searchCriteria = null;
const escapeHtml = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 3000); }
function showModal(id) { $(id).classList.remove('hidden'); }
function hideModal(id) { $(id).classList.add('hidden'); }
function requireLogin() { if (!currentUser()) { toast('Please log in or register first.'); openAuth('login'); return false; } return true; }

function openAuth(mode) {
  authMode = mode; $('auth-title').textContent = mode === 'login' ? 'Login to your account' : 'Create your account';
  $('auth-submit').textContent = mode === 'login' ? 'Login' : 'Create account';
  $('auth-name-wrap').classList.toggle('hidden', mode === 'login'); $('auth-name').required = mode === 'register';
  $('auth-switch').innerHTML = mode === 'login' ? 'New here? <button type="button" id="switch-register">Create an account</button>' : 'Already registered? <button type="button" id="switch-login">Login instead</button>';
  showModal('auth-modal');
}
document.addEventListener('click', e => {
  if (e.target.id === 'switch-register') openAuth('register');
  if (e.target.id === 'switch-login') openAuth('login');
});
$('login-open').onclick = () => openAuth('login');
$('register-open').onclick = () => openAuth('register');
$('auth-close').onclick = () => hideModal('auth-modal');
$('logout-btn').onclick = () => { save(STORAGE.current, null); renderAuth(); renderBookings(); toast('You have logged out.'); };
$('auth-form').onsubmit = e => {
  e.preventDefault();
  const email = $('auth-email').value.trim().toLowerCase(), password = $('auth-password').value;
  let users = read(STORAGE.users, []);
  if (authMode === 'register') {
    if (users.some(u => u.email === email)) return toast('An account with this email already exists.');
    const user = {name:$('auth-name').value.trim(), email, password};
    users.push(user); save(STORAGE.users, users); save(STORAGE.current, {name:user.name,email:user.email});
    toast('Registration successful. Welcome to BusGo!');
  } else {
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return toast('Invalid email or password. Please register if you are new.');
    save(STORAGE.current, {name:user.name,email:user.email}); toast(`Welcome back, ${user.name}!`);
  }
  hideModal('auth-modal'); $('auth-form').reset(); renderAuth(); renderBookings();
};
function renderAuth() {
  const user = currentUser(); $('login-open').classList.toggle('hidden', !!user); $('register-open').classList.toggle('hidden', !!user);
  $('welcome-user').classList.toggle('hidden', !user); $('logout-btn').classList.toggle('hidden', !user);
  $('welcome-user').textContent = user ? `Hi, ${user.name.split(' ')[0]}` : '';
}
function bookedSeatIds(busId) { return getBookings().filter(b => b.busId === busId && b.status === 'Confirmed').flatMap(b => b.seats); }
function renderBuses(buses = getBuses()) {
  $('result-count').textContent = `${buses.length} bus${buses.length === 1 ? '' : 'es'} found`;
  if (!buses.length) { $('bus-results').innerHTML = '<div class="empty-state">No buses found for this route. Try another city or bus type.</div>'; return; }
  $('bus-results').innerHTML = buses.map(bus => {
    const available = bus.seats - bookedSeatIds(bus.id).length;
    return `<article class="bus-card"><div class="operator"><div class="operator-icon">🚌</div><div><h3>${escapeHtml(bus.operator)}</h3><p>${escapeHtml(bus.type)} · ${available} seats left</p></div></div><div class="route"><div><div class="time">${escapeHtml(bus.depart)}</div><div class="city">${escapeHtml(bus.from)}</div></div><div class="route-line">direct</div><div><div class="time">${escapeHtml(bus.arrive)}</div><div class="city">${escapeHtml(bus.to)}</div></div></div><div class="bus-price"><div class="fare">₹${Number(bus.fare).toLocaleString('en-IN')} <small>/ seat</small></div><p>Taxes included</p><button class="btn btn-primary" data-book="${escapeHtml(bus.id)}" ${available <= 0 ? 'disabled' : ''}>${available <= 0 ? 'Sold out' : 'Select seats →'}</button></div></article>`;
  }).join('');
  document.querySelectorAll('[data-book]').forEach(btn => btn.onclick = () => openSeats(btn.dataset.book));
  updateCommentBusOptions();
}
$('search-form').onsubmit = e => {
  e.preventDefault();
  const from = $('from-city').value.trim(), to = $('to-city').value.trim(), type = $('bus-type').value;
  if (from.toLowerCase() === to.toLowerCase()) return toast('Departure and destination must be different.');
  searchCriteria = {from,to,date:$('journey-date').value,type};
  const found = getBuses().filter(b => b.from.toLowerCase() === from.toLowerCase() && b.to.toLowerCase() === to.toLowerCase() && (type === 'all' || b.type === type));
  renderBuses(found); $('results-section').scrollIntoView({behavior:'smooth'});
};
function openSeats(busId) {
  if (!requireLogin()) return;
  activeBus = getBuses().find(b => b.id === busId); selectedSeats = [];
  if (!activeBus) return;
  $('seat-title').textContent = `${activeBus.from} → ${activeBus.to}`;
  $('seat-summary').textContent = `${activeBus.operator} · ${activeBus.depart}–${activeBus.arrive} · ₹${activeBus.fare} per seat`;
  renderSeats(); showModal('seat-modal');
}
function renderSeats() {
  const booked = bookedSeatIds(activeBus.id);
  $('seat-grid').innerHTML = Array.from({length:activeBus.seats}, (_,i) => {
    const n = i + 1, isBooked = booked.includes(n), isSelected = selectedSeats.includes(n);
    return `<button type="button" class="seat ${isBooked?'booked':''} ${isSelected?'selected':''}" data-seat="${n}" ${isBooked?'disabled':''}>${String(n).padStart(2,'0')}</button>`;
  }).join('');
  document.querySelectorAll('[data-seat]').forEach(btn => btn.onclick = () => {
    const n = Number(btn.dataset.seat);
    selectedSeats = selectedSeats.includes(n) ? selectedSeats.filter(x => x !== n) : selectedSeats.length >= 6 ? (toast('You can select up to 6 seats per booking.'), selectedSeats) : [...selectedSeats,n];
    renderSeats();
  });
  $('seat-total').textContent = `${selectedSeats.length} seat${selectedSeats.length === 1 ? '' : 's'} selected`;
  $('confirm-booking').textContent = `Continue · ₹${selectedSeats.length * activeBus.fare}`;
  $('confirm-booking').disabled = selectedSeats.length === 0;
}
$('seat-close').onclick = () => hideModal('seat-modal');
$('confirm-booking').onclick = () => {
  if (!selectedSeats.length) return toast('Please select at least one seat.');
  if (!requireLogin()) return;
  $('payment-summary').innerHTML = `<strong>${escapeHtml(activeBus.operator)}</strong><br>${escapeHtml(activeBus.from)} → ${escapeHtml(activeBus.to)} · ${escapeHtml(searchCriteria?.date || $('journey-date').value)}<br>Seats: ${selectedSeats.join(', ')}<br><strong>Total: ₹${selectedSeats.length * activeBus.fare}</strong>`;
  const user = currentUser(); $('passenger-name').value = user.name; $('passenger-email').value = user.email; $('passenger-phone').value = '';
  hideModal('seat-modal'); showModal('payment-modal');
};
$('payment-close').onclick = () => hideModal('payment-modal');
$('payment-form').onsubmit = e => {
  e.preventDefault();
  if (!currentUser()) return toast('Please log in again to continue.');
  const bookings = getBookings(), booked = bookedSeatIds(activeBus.id);
  if (selectedSeats.some(s => booked.includes(s))) { hideModal('payment-modal'); toast('A selected seat was just booked. Please select again.'); renderBuses(); return; }
  const booking = {id:'BG'+Date.now().toString().slice(-8),userEmail:currentUser().email,busId:activeBus.id,operator:activeBus.operator,from:activeBus.from,to:activeBus.to,date:searchCriteria?.date || $('journey-date').value,depart:activeBus.depart,arrive:activeBus.arrive,seats:[...selectedSeats],fare:activeBus.fare,total:selectedSeats.length*activeBus.fare,passenger:$('passenger-name').value.trim(),email:$('passenger-email').value.trim(),phone:$('passenger-phone').value.trim(),status:'Confirmed',createdAt:new Date().toISOString()};
  bookings.push(booking); save(STORAGE.bookings,bookings); hideModal('payment-modal'); $('payment-form').reset(); selectedSeats=[]; renderBookings(); renderBuses(); renderAdmin(); toast(`Booking confirmed! Your booking ID is ${booking.id}`); $('my-bookings').scrollIntoView({behavior:'smooth'});
};
function renderBookings() {
  const user = currentUser();
  const bookings = getBookings().filter(b => user && b.userEmail === user.email).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  if (!user) { $('booking-list').innerHTML = '<div class="empty-state">Log in to view your bookings.</div>'; return; }
  if (!bookings.length) { $('booking-list').innerHTML = '<div class="empty-state">No bookings yet. Search for a bus to plan your first trip.</div>'; return; }
  $('booking-list').innerHTML = bookings.map(b => `<article class="booking-card"><div><h3>${escapeHtml(b.from)} → ${escapeHtml(b.to)}</h3><p>${escapeHtml(b.operator)} · ${escapeHtml(b.date)} · ${escapeHtml(b.depart)} departure<br>Booking ID: ${escapeHtml(b.id)} · Seat(s): ${b.seats.join(', ')} · ₹${b.total}</p></div><div class="booking-right"><span class="status ${b.status==='Cancelled'?'cancelled':''}">${b.status}</span>${b.status==='Confirmed'?`<button class="btn btn-outline btn-small" data-cancel="${escapeHtml(b.id)}">Cancel ticket</button>`:''}</div></article>`).join('');
  document.querySelectorAll('[data-cancel]').forEach(btn => btn.onclick = () => {
    if (!confirm('Cancel this booking?')) return;
    const all = getBookings(), item = all.find(b=>b.id===btn.dataset.cancel);
    if (item && item.userEmail === currentUser()?.email && item.status==='Confirmed') { item.status='Cancelled'; save(STORAGE.bookings,all); renderBookings(); renderBuses(); renderAdmin(); toast('Booking cancelled.'); }
  });
}
$('refresh-bookings').onclick = renderBookings;
function updateCommentBusOptions() {
  const selected = $('comment-bus').value, buses = getBuses();
  $('comment-bus').innerHTML = '<option value="All buses">All buses</option>' + buses.map(b=>`<option value="${escapeHtml(b.operator)}">${escapeHtml(b.operator)}</option>`).join('');
  if ([...$('comment-bus').options].some(o=>o.value===selected)) $('comment-bus').value=selected;
}
$('comment-form').onsubmit = e => {
  e.preventDefault(); const comments = getComments();
  comments.unshift({id:Date.now(),name:$('comment-name').value.trim(),bus:$('comment-bus').value,text:$('comment-text').value.trim(),date:new Date().toLocaleDateString()});
  save(STORAGE.comments,comments); $('comment-text').value=''; renderComments(); toast('Thanks for sharing your feedback!');
};
function renderComments() {
  const comments=getComments();
  $('comment-list').innerHTML = comments.length ? comments.map(c=>`<article class="comment-item"><strong>${escapeHtml(c.name)}</strong><div class="muted">${escapeHtml(c.bus)} · ${escapeHtml(c.date)}</div><p>${escapeHtml(c.text)}</p></article>`).join('') : '<div class="empty-state">Be the first to share a travel review.</div>';
}
$('admin-nav').onclick = () => { $('admin-panel').classList.toggle('hidden'); renderAdmin(); if (!$('admin-panel').classList.contains('hidden')) $('admin-panel').scrollIntoView({behavior:'smooth'}); };
$('close-admin').onclick = () => $('admin-panel').classList.add('hidden');
$('add-bus-form').onsubmit = e => {
  e.preventDefault(); const buses=getBuses();
  buses.push({id:'b'+Date.now(),operator:$('new-operator').value.trim(),from:$('new-from').value.trim(),to:$('new-to').value.trim(),depart:$('new-depart').value,arrive:$('new-arrive').value,type:$('new-type').value,fare:Number($('new-fare').value),seats:Number($('new-seats').value)});
  save(STORAGE.buses,buses); e.target.reset(); $('new-seats').value=24; renderBuses(); renderAdmin(); toast('Bus added successfully.');
};
function renderAdmin() {
  const buses=getBuses(), bookings=getBookings(), users=read(STORAGE.users,[]);
  $('report-stats').innerHTML = `<div class="stat"><strong>${buses.length}</strong><span>Buses</span></div><div class="stat"><strong>${bookings.filter(b=>b.status==='Confirmed').length}</strong><span>Active bookings</span></div><div class="stat"><strong>${users.length}</strong><span>Users</span></div>`;
  $('admin-bus-list').innerHTML = buses.map(b=>`<div class="admin-bus-row"><span><strong>${escapeHtml(b.operator)}</strong><br><span class="muted">${escapeHtml(b.from)} → ${escapeHtml(b.to)} · ₹${b.fare}</span></span><button class="btn btn-outline btn-small" data-delete-bus="${escapeHtml(b.id)}">Delete</button></div>`).join('');
  document.querySelectorAll('[data-delete-bus]').forEach(btn=>btn.onclick=()=>{if(confirm('Delete this bus from the list?')){save(STORAGE.buses,getBuses().filter(b=>b.id!==btn.dataset.deleteBus));renderAdmin();renderBuses();updateCommentBusOptions();toast('Bus removed. Existing booking records are retained.');}});
}
$('export-report').onclick = () => {
  const rows=[['Booking ID','Passenger','Email','From','To','Date','Operator','Seats','Total','Status'],...getBookings().map(b=>[b.id,b.passenger,b.email,b.from,b.to,b.date,b.operator,b.seats.join(' '),b.total,b.status])];
  const csv=rows.map(row=>row.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\r\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}), url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download='busgo-booking-report.csv'; a.click(); URL.revokeObjectURL(url);
};
renderAuth(); renderBuses(); renderBookings(); renderComments(); renderAdmin();
