-- ===== Step 2: the three tables =====
PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

CREATE TABLE students (
  student_id INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
  course_id INTEGER PRIMARY KEY,
  title     TEXT NOT NULL,
  credits   INTEGER NOT NULL
);

CREATE TABLE enrolments (
  enrolment_id INTEGER PRIMARY KEY,
  student_id   INTEGER NOT NULL,
  course_id    INTEGER NOT NULL,
  grade        INTEGER CHECK (grade BETWEEN 0 AND 100),
  FOREIGN KEY (student_id) REFERENCES students (student_id),
  FOREIGN KEY (course_id)  REFERENCES courses (course_id),
  UNIQUE (student_id, course_id)
);

-- ===== Step 3: sample data =====
INSERT INTO students (student_id, name, email) VALUES
  (1, 'Amina Hassan',    'amina@example.com'),
  (2, 'Brian Otieno',    'brian@example.com'),
  (3, 'Cynthia Wanjiru', 'cynthia@example.com'),
  (4, 'David Mutiso',    'david@example.com');

INSERT INTO courses (course_id, title, credits) VALUES
  (1, 'Web Foundations', 3),
  (2, 'Databases',       4),
  (3, 'Networking',      3);

INSERT INTO enrolments (student_id, course_id, grade) VALUES
  (1, 1, 78),
  (1, 2, NULL),
  (2, 1, 64),
  (2, 3, 72),
  (3, 2, 90),
  (3, 1, NULL);

-- ===== Step 4: the five queries =====

-- Query 1: all courses for one student (by name)
SELECT c.title, c.credits, e.grade
FROM students s
JOIN enrolments e ON e.student_id = s.student_id
JOIN courses c ON c.course_id = e.course_id
WHERE s.name = 'Amina Hassan';

-- Query 2: all students on one course
SELECT s.name, s.email
FROM courses c
JOIN enrolments e ON e.course_id = c.course_id
JOIN students s ON s.student_id = e.student_id
WHERE c.title = 'Web Foundations';

-- Query 3: number of students per course
SELECT c.title, COUNT(e.enrolment_id) AS student_count
FROM courses c
LEFT JOIN enrolments e ON e.course_id = c.course_id
GROUP BY c.course_id, c.title;

-- Query 4: students who have no enrolments
SELECT s.student_id, s.name
FROM students s
LEFT JOIN enrolments e ON e.student_id = s.student_id
WHERE e.enrolment_id IS NULL;

-- Query 5: update one enrolment's grade
UPDATE enrolments
SET grade = 88
WHERE student_id = (SELECT student_id FROM students WHERE name = 'Amina Hassan')
  AND course_id   = (SELECT course_id FROM courses WHERE title = 'Databases');

SELECT * FROM enrolments;