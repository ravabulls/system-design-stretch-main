# Stretch Records: System Design Fundamentals starter

This repository is your workspace for all five lessons of the System Design
Fundamentals course. It starts exactly where the JavaScript course's finale
left off: the Stretch Records artist page, its five artists rendered from an
array in `stretch-records/script.js`.

## What is in here

- `stretch-records/`: the provided artist page. Serve it with Live Server.
  Every site change the lessons ask for happens in this folder.
- `lesson-01.js` to `lesson-04.js`: one file per lesson for your standalone
  work, run with `node`. Lesson 2 carries two provided programs; read the
  comments at the top of each file.
- `lesson-05.md`: the written system audit for the final lesson.
- `stretch-records/label.json`: the label's own information, provided for
  Lesson 4. You will serve it with json-server on a second port.

## The workflow

One branch and one reviewed pull request per lesson, with `main` always
holding the merged state:

1. Create a branch named `lesson-01` from `main`.
2. Do the lesson's task: site changes in `stretch-records/`, standalone work
   in the lesson file.
3. Commit, push the branch, and open a pull request.
4. Submit the pull request link, and merge after review.
5. The next lesson branches from the updated `main`.

## Before Lesson 1

Remove this clone's connection to the original repository, publish it to
your own GitHub account, and add your reviewer, as described in the course.
