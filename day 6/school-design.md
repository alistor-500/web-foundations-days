# School Database Design

## The tables

- **students**: one row per student, with a unique `student_id`, the student's `name`, and a `UNIQUE` `email` so no two students share an address.
- **courses**: one row per course, with a unique `course_id`, the course `title` and its `credits`.
- **enrolments**: one row each time a student takes a course. It stores the `student_id`, the `course_id` and the `grade`. A `UNIQUE (student_id, course_id)` rule stops the same student enrolling on the same course twice.

## Relationships

- **students to enrolments is one-to-many.** One student can have many enrolments, but each enrolment belongs to exactly one student.
- **courses to enrolments is one-to-many.** One course can have many enrolments, but each enrolment belongs to exactly one course.
- **students to courses is many-to-many.** One student can take many courses, and one course can have many students.

### Why a join table is needed

A single table cannot store a many-to-many relationship cleanly. Putting several course ids in one student cell breaks the rule of one value per cell and makes queries hard. Repeating the whole student row for each course wastes space and risks the copies disagreeing. The `enrolments` table solves this by turning the many-to-many relationship into two one-to-many relationships. It also has a natural place to store the `grade`, because a grade belongs to the pairing of a student and a course, not to either one alone.

## An index I would add

```sql
CREATE INDEX idx_enrolments_course_id ON enrolments (course_id);
```

The `UNIQUE (student_id, course_id)` rule already creates an index that starts with `student_id`, so looking up a student's courses is fast. Queries that start from a course, such as "all students on one course" and "number of students per course", search by `course_id` and cannot use that index well. An index on `enrolments (course_id)` lets the database jump straight to the matching rows instead of scanning the whole table as the school grows.

## SQL or NoSQL?

I would choose SQL for this system. The data is structured and has clear relationships: students, courses and enrolments always have the same fields, and enrolments depend on both of the others. A relational database enforces those links with foreign keys, stops duplicate emails and duplicate enrolments with `UNIQUE`, and answers questions like "how many students per course" and "who has no enrolments" with joins and `GROUP BY`. School records also need accuracy more than anything else, and SQL transactions help keep them correct. NoSQL would make more sense if the data had no fixed shape or had to be spread across many servers for huge traffic, and neither applies to a school database.