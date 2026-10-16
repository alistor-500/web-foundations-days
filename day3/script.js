let notes = [
  { id: 1, text: "Buy milk and bread", category: "personal" },
  { id: 2, text: "Finish the Day 3 assignment", category: "study" },
  { id: 3, text: "Email the project report to Grace", category: "work" },
  { id: 4, text: "Revise JavaScript arrays", category: "study" },
  { id: 5, text: "Call mum", category: "personal" },
];

const validCategories = ["personal", "work", "study"];
function searchNotes(word) {
  const search = word.toLowerCase();
  return notes.filter(function (note) {
    return note.text.toLowerCase().includes(search);
  });
}

// Tests for searchNotes
console.log(searchNotes("MILK")); // Expected: array with 1 note (id 1, "Buy milk and bread")
console.log(searchNotes("xyz")); // Expected: [] (no results)
function longestNote() {
  if (notes.length === 0) {
    return null;
  }
  let longest = notes[0];
  for (const note of notes) {
    if (note.text.length > longest.text.length) {
      longest = note;
    }
  }
  return longest;
}

// Tests for longestNote
console.log(longestNote()); // Expected: note id 3 ("Email the project report to Grace")

const savedNotes = notes; // keep the real notes safe
notes = [];
console.log(longestNote()); // Expected: null (empty array)
notes = savedNotes; // put the notes back
function countByCategory() {
  const counts = {};
  for (const note of notes) {
    counts[note.category] = (counts[note.category] || 0) + 1;
  }
  return counts;
}

// Tests for countByCategory
console.log(countByCategory()); // Expected: { personal: 2, study: 2, work: 1 }

notes = [];
console.log(countByCategory()); // Expected: {} (empty object)
notes = savedNotes;
function getSummary() {
  const counts = countByCategory();
  const total = notes.length;
  const word = total === 1 ? "note" : "notes";

  const parts = [];
  for (const category of validCategories) {
    if (counts[category]) {
      parts.push(`${counts[category]} ${category}`);
    }
  }

  if (total === 0) {
    return "0 notes.";
  }
  return `${total} ${word}: ${parts.join(", ")}.`;
}

// Tests for getSummary
console.log(getSummary()); // Expected: "5 notes: 2 personal, 1 work, 2 study."

notes = [{ id: 1, text: "Only note", category: "work" }];
console.log(getSummary()); // Expected: "1 note: 1 work."
notes = savedNotes;
function normalizeText(text) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function isDuplicate(text) {
  const target = normalizeText(text);
  return notes.some(function (note) {
    return normalizeText(note.text) === target;
  });
}

// Tests for isDuplicate
console.log(isDuplicate("  BUY milk   and bread ")); // Expected: true (ignores case and extra spaces)
console.log(isDuplicate("Water the plants")); // Expected: false (not in the list)
function addNote(text, category) {
  if (typeof text !== "string") {
    console.log("Not added: text must be a string.");
    return false;
  }

  const cleaned = text.trim().replace(/\s+/g, " ");

  if (cleaned.length < 1 || cleaned.length > 200) {
    console.log("Not added: text must be 1 to 200 characters.");
    return false;
  }

  if (isDuplicate(cleaned)) {
    console.log("Not added: that note already exists.");
    return false;
  }

  if (!validCategories.includes(category)) {
    console.log("Not added: category must be personal, work or study.");
    return false;
  }

  const newId =
    notes.length > 0 ? Math.max(...notes.map((note) => note.id)) + 1 : 1;
  notes.push({ id: newId, text: cleaned, category: category });
  return true;
}
// Tests for addNote
console.log(addNote("Water the plants", "personal")); // Expected: true (note added)
console.log(addNote("  buy MILK   and bread ", "personal")); // Expected: "Not added: that note already exists." then false
console.log(addNote("", "work")); // Expected: "Not added: text must be 1 to 200 characters." then false
console.log(addNote("a".repeat(201), "work")); // Expected: "Not added: text must be 1 to 200 characters." then false
console.log(addNote("Plan holiday", "hobby")); // Expected: "Not added: category must be personal, work or study." then false
console.log(getSummary()); // Expected: "6 notes: 3 personal, 1 work, 2 study."
