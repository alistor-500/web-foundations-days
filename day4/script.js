const noteText = document.getElementById("note-text");
const charCount = document.getElementById("char-count");
const wordCount = document.getElementById("word-count");
const clearBtn = document.getElementById("clear-btn");
const themeToggle = document.getElementById("theme-toggle");

function updateCounts() {
  const text = noteText.value;
  const length = text.length;
  const trimmed = text.trim();
  const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;

  charCount.textContent = `${length} / 200 characters`;
  wordCount.textContent = `${words} words`;

  charCount.classList.toggle("warning", length > 180);
  charCount.classList.toggle("over", length > 200);
}
noteText.addEventListener("input", function () {
  updateCounts();
  localStorage.setItem("draft", noteText.value);
});
function applyTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  themeToggle.textContent = isDark ? "Light mode" : "Dark mode";
}

// Page load: restore the draft and the theme, then update the counters
const savedDraft = localStorage.getItem("draft");
if (savedDraft !== null) {
  noteText.value = savedDraft;
}

applyTheme(localStorage.getItem("theme") === "dark");

updateCounts();
function clearNote() {
  noteText.value = "";
  localStorage.removeItem("draft");
  updateCounts();
}

clearBtn.addEventListener("click", clearNote);

noteText.addEventListener("keydown", function (event) {
  if (event.key === "Escape") {
    clearNote();
  }
});
themeToggle.addEventListener("click", function () {
  const isDark = !document.body.classList.contains("dark");
  applyTheme(isDark);
  localStorage.setItem("theme", isDark ? "dark" : "light");
});