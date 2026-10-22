
const $ = id => document.getElementById(id);

let books = JSON.parse(localStorage.getItem("books")) || [
  { id: 1, title: "Python Programming", author: "Reema Thareja", category: "Programming", quantity: 5, available: 5 },
  { id: 2, title: "Database Management Systems", author: "Raghu Ramakrishnan", category: "Database", quantity: 4, available: 4 },
  { id: 3, title: "Java: The Complete Reference", author: "Herbert Schildt", category: "Programming", quantity: 3, available: 3 }
];

let users = JSON.parse(localStorage.getItem("users")) || [];
let issues = JSON.parse(localStorage.getItem("issues")) || [];
let materials = JSON.parse(localStorage.getItem("materials")) || [];
let currentUser = JSON.parse(sessionStorage.getItem("currentUser")) || null;

// Demo account only. Do not use this client-side authentication for production.
const ADMIN = { name: "Library Admin", email: "admin@library.com", password: "admin123", role: "admin" };

function saveData() {
  localStorage.setItem("books", JSON.stringify(books));
  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("issues", JSON.stringify(issues));
  localStorage.setItem("materials", JSON.stringify(materials));
}

function showPage(id) {
  if (id === "admin" && currentUser?.role !== "admin") {
    alert("Please log in as admin.");
    return showPage("login");
  }

  if (["history", "profile"].includes(id) && !currentUser) {
    alert("Please log in first.");
    return showPage("login");
  }

  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  $(id).classList.add("active");

  renderBooks();
  renderStats();
  renderHistory();
  renderProfile();
  renderMaterials();

  if (id === "admin") renderAdmin();
}

function renderStats() {
  $("totalBooks").textContent = books.reduce((sum, b) => sum + b.quantity, 0);
  $("availableBooks").textContent = books.reduce((sum, b) => sum + b.available, 0);
  $("issuedBooks").textContent = issues.filter(i => !i.returned).length;
}

function renderBooks() {
  const query = ($("searchBook")?.value || "").toLowerCase();

  $("bookList").innerHTML = books
    .filter(b => `${b.title} ${b.author} ${b.category}`.toLowerCase().includes(query))
    .map(b => `
      <div class="book-card">
        <h3>${escapeHTML(b.title)}</h3>
        <p>Author: ${escapeHTML(b.author)}</p>
        <p>Category: ${escapeHTML(b.category)}</p>
        <p class="${b.available ? "status" : "unavailable"}">
          ${b.available} available
        </p>
        ${currentUser?.role === "student" && b.available > 0
          ? `<button onclick="issueBook(${b.id})">Borrow Book</button>` : ""}
      </div>
    `).join("") || "<p>No books found.</p>";
}

function issueBook(bookId) {
  if (!currentUser || currentUser.role !== "student") {
    alert("Please log in with a student account.");
    return showPage("login");
  }

  const book = books.find(b => b.id === bookId);
  if (!book || book.available <= 0) return alert("Book unavailable.");

  const active = issues.filter(i =>
    i.userEmail === currentUser.email && !i.returned
  );

  if (active.some(i => i.bookId === bookId)) {
    return alert("You have already borrowed this book.");
  }

  const issueDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  issues.push({
    id: Date.now(),
    bookId,
    userEmail: currentUser.email,
    issueDate: issueDate.toISOString(),
    dueDate: dueDate.toISOString(),
    returned: false,
    returnDate: null,
    fine: 0
  });

  book.available--;
  saveData();
  renderBooks();
  renderStats();
  alert("Book issued successfully. Return within 14 days.");
}

function calculateFine(issue) {
  const end = issue.returned && issue.returnDate
    ? new Date(issue.returnDate) : new Date();

  const overdueDays = Math.max(
    0,
    Math.ceil((end - new Date(issue.dueDate)) / (1000 * 60 * 60 * 24))
  );

  return overdueDays * 5;
}

function renderHistory() {
  if (!currentUser) return;

  const mine = issues.filter(i => i.userEmail === currentUser.email);

  $("historyList").innerHTML = mine.map(i => {
    const book = books.find(b => b.id === i.bookId);
    const fine = calculateFine(i);

    return `
      <div class="record">
        <h3>${escapeHTML(book?.title || "Deleted book")}</h3>
        <p>Issue Date: ${new Date(i.issueDate).toLocaleDateString()}</p>
        <p>Expected Return: ${new Date(i.dueDate).toLocaleDateString()}</p>
        <p>Status: ${i.returned ? "Returned" : "Borrowed"}</p>
        <p>Fine: ₹${fine}</p>
      </div>
    `;
  }).join("") || "<p>No borrowing history available.</p>";

  $("fineTotal").textContent = "Total fine: ₹" +
    mine.reduce((sum, i) => sum + calculateFine(i), 0);
}

function renderAdmin() {
  $("adminBookList").innerHTML = books.map(b => `
    <div class="record">
      <strong>${escapeHTML(b.title)}</strong>
      <p>Quantity: ${b.quantity} | Available: ${b.available}</p>
      <button onclick="editBook(${b.id})">Update</button>
      <button onclick="deleteBook(${b.id})">Delete</button>
    </div>
  `).join("");

  $("adminIssueList").innerHTML = issues.map(i => {
    const book = books.find(b => b.id === i.bookId);

    return `
      <div class="record">
        <strong>${escapeHTML(book?.title || "Deleted book")}</strong>
        <p>Student: ${escapeHTML(i.userEmail)}</p>
        <p>Due: ${new Date(i.dueDate).toLocaleDateString()}</p>
        <p>Status: ${i.returned ? "Returned" : "Issued"}</p>
        <p>Fine: ₹${calculateFine(i)}</p>
        ${!i.returned
          ? `<button onclick="returnBook(${i.id})">Mark Returned</button>` : ""}
      </div>
    `;
  }).join("") || "<p>No issue records.</p>";
}

function editBook(id) {
  const book = books.find(b => b.id === id);
  const title = prompt("Book title:", book.title);
  if (title === null || !title.trim()) return;

  const author = prompt("Author:", book.author);
  if (author === null || !author.trim()) return;

  const category = prompt("Category:", book.category);
  if (category === null || !category.trim()) return;

  const quantity = prompt("Total quantity:", book.quantity);
  if (quantity === null || !Number.isInteger(Number(quantity))) return;

  const newQuantity = Number(quantity);
  const borrowed = book.quantity - book.available;

  if (newQuantity < borrowed || newQuantity < 0) {
    return alert("Quantity cannot be less than the number of borrowed copies.");
  }

  book.title = title.trim();
  book.author = author.trim();
  book.category = category.trim();
  book.quantity = newQuantity;
  book.available = newQuantity - borrowed;

  saveData();
  renderAdmin();
  renderBooks();
  renderStats();
}

function deleteBook(id) {
  if (issues.some(i => i.bookId === id && !i.returned)) {
    return alert("Return all issued copies before deleting this book.");
  }

  if (!confirm("Delete this book?")) return;

  books = books.filter(b => b.id !== id);
  saveData();
  renderAdmin();
  renderBooks();
  renderStats();
}

function returnBook(issueId) {
  const issue = issues.find(i => i.id === issueId);
  if (!issue || issue.returned) return;

  issue.returned = true;
  issue.returnDate = new Date().toISOString();

  const book = books.find(b => b.id === issue.bookId);
  if (book) book.available++;

  saveData();
  renderAdmin();
  renderHistory();
  renderStats();
  alert("Book returned. Fine: ₹" + calculateFine(issue));
}

$("loginForm").addEventListener("submit", e => {
  e.preventDefault();

  const email = $("loginEmail").value.trim().toLowerCase();
  const password = $("loginPassword").value;

  const user = email === ADMIN.email
    ? (password === ADMIN.password ? ADMIN : null)
    : users.find(u => u.email === email && u.password === password);

  if (!user) return alert("Invalid email or password.");

  currentUser = {
    name: user.name,
    email: user.email,
    role: user.role || "student"
  };

  sessionStorage.setItem("currentUser", JSON.stringify(currentUser));
  alert("Login successful!");

  showPage(currentUser.role === "admin" ? "admin" : "home");
});

$("registerForm").addEventListener("submit", e => {
  e.preventDefault();

  const name = $("regName").value.trim();
  const email = $("regEmail").value.trim().toLowerCase();
  const password = $("regPassword").value;

  if (email === ADMIN.email || users.some(u => u.email === email)) {
    return alert("Email already registered.");
  }

  users.push({ name, email, password, role: "student" });
  saveData();
  e.target.reset();
  alert("Registration successful. Please log in.");
  showPage("login");
});

$("bookForm").addEventListener("submit", e => {
  e.preventDefault();

  if (currentUser?.role !== "admin") return alert("Admin login required.");

  const quantity = Number($("bookQuantity").value);
  if (!Number.isInteger(quantity) || quantity < 1) {
    return alert("Enter a valid quantity.");
  }

  books.push({
    id: Date.now(),
    title: $("bookTitle").value.trim(),
    author: $("bookAuthor").value.trim(),
    category: $("bookCategory").value.trim(),
    quantity,
    available: quantity
  });

  saveData();
  e.target.reset();
  renderAdmin();
  renderBooks();
  renderStats();
  alert("Book added successfully.");
});

function renderMaterials() {
  const year = $("filterYear").value;
  const semester = $("filterSemester").value;

  $("materialList").innerHTML = materials
    .filter(m => (!year || m.year === year) &&
                 (!semester || m.semester === semester))
    .map(m => `
      <div class="material-card">
        <h3>${escapeHTML(m.title)}</h3>
        <p>${escapeHTML(m.year)} — ${escapeHTML(m.semester)}</p>
        <a href="${m.url}" download="${escapeHTML(m.fileName)}">Download Material</a>
      </div>
    `).join("") || "<p>No study materials available.</p>";
}

$("materialForm").addEventListener("submit", e => {
  e.preventDefault();

  if (currentUser?.role !== "admin") return alert("Admin login required.");

  const file = $("materialFile").files[0];
  if (!file) return alert("Select a file.");

  // Store file contents as a data URL for this small demonstration.
  const reader = new FileReader();

  reader.onload = () => {
    materials.push({
      id: Date.now(),
      title: $("materialTitle").value.trim(),
      year: $("materialYear").value,
      semester: $("materialSemester").value,
      fileName: file.name,
      url: reader.result
    });

    try {
      saveData();
      e.target.reset();
      renderMaterials();
      alert("Material uploaded successfully.");
    } catch (error) {
      materials.pop();
      alert("File is too large for browser storage. Use a backend for larger files.");
    }
  };

  reader.readAsDataURL(file);
});

function renderProfile() {
  if (!currentUser) return;

  $("profileInfo").innerHTML = `
    <p><strong>Name:</strong> ${escapeHTML(currentUser.name)}</p>
    <p><strong>Email:</strong> ${escapeHTML(currentUser.email)}</p>
    <p><strong>Role:</strong> ${escapeHTML(currentUser.role)}</p>
  `;
}

function logout() {
  currentUser = null;
  sessionStorage.removeItem("currentUser");
  alert("Logged out successfully.");
  showPage("home");
}

$("contactForm").addEventListener("submit", e => {
  e.preventDefault();
  alert("Thank you for contacting us! This demo does not send messages to a server.");
  e.target.reset();
});

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

renderStats();
renderBooks();
renderMaterials();
