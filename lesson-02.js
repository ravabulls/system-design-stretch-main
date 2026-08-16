"use strict";

// Lesson 2: Asynchronous JavaScript and the Event Loop.
// Standalone programs and observations go in this file as code and comments.

// ===== Provided program (task step 2): predict before you run =====
// Write your predicted output order as a comment BELOW, before running this
// file with node. Then run it, mark each line of your prediction right or
// wrong, and correct the wrong ones with one sentence each explaining why.

console.log("doors open");
setTimeout(() => console.log("encore"), 1000);
setTimeout(() => console.log("soundcheck"), 0);
console.log("main act");
setTimeout(() => console.log("intermission"), 500);
console.log("lights down");

// Your prediction:
// 1. doors open
// 2. main act
// 3. lights down
// 4. soundcheck
// 5. intermission
// 6. encore

// Actual output (node lesson-02.js):
// doors open, main act, lights down, soundcheck, intermission, encore
//
// 1. doors open      - correct
// 2. main act         - correct
// 3. lights down       - correct
// 4. soundcheck        - correct
// 5. intermission      - correct
// 6. encore            - correct
//
// All six landed right. The three console.log calls are synchronous, so the
// call stack runs them to completion first, in source order, before the
// event loop even looks at a timer queue: doors open, main act, lights down.
// setTimeout never blocks that stack, even with a delay of 0 - it hands its
// callback to a Web API/timer facility, which only queues the callback once
// the delay elapses AND the call stack is empty. So the three timers race by
// delay, not by the order they were written: soundcheck (0ms) first, then
// intermission (500ms), then encore (1000ms) last.

// ===== Task step 3: the blocking loop =====
// A "Freeze the page (3s)" button was added to stretch-records/index.html,
// wired to a click handler in stretch-records/script.js that busy-waits in a
// while loop checking Date.now() until 3000ms had passed, doing no useful
// work, just spinning. Both are now commented out there, evidence kept in
// place, after the freeze was observed.
//
// What happened while it ran: none of the other artist cards could be
// selected, nothing could be typed into the suggestion form, and the
// Shuffle button did not respond, exactly as expected. The page looked
// completely dead for the full three seconds, then came back all at once.
//
// What was occupied: the single call stack, which is also the only thread
// JavaScript runs on in the browser. The while loop never returned, so it
// never gave the stack back.
//
// What could not happen while it was occupied: the event loop could not
// pull anything from the callback queue and push it onto the stack, because
// the stack was never empty. That blocked every kind of pending work at
// once, mouse clicks and keystrokes waiting to be handled, and even a
// setTimeout(fn, 0) queued the moment the freeze started would still have
// waited the full three seconds, because being "ready" only earns a
// callback a place in the queue; it still needs an empty stack before the
// loop will hand it a turn. The browser could not repaint either, which is
// why the button looked stuck in its pressed state until the loop released
// the stack.

// ===== Provided program (task step 4): trace the call stack =====
// Call stack diagram, every push and pop in order:
//
// PUSH main                          - module scope starts running
// PUSH prepare({ name: "Asake" })    - called to build console.log's argument
// PUSH format({ name: "Asake" })     - called from inside prepare's return
//      format runs artist.name.toUpperCase() -> "ASAKE", nothing left to call
// POP  format                        - returns "ASAKE" to prepare
//      prepare concatenates "Now playing " + "ASAKE", nothing left to call
// POP  prepare                       - returns "Now playing ASAKE" to main
// PUSH console.log("Now playing ASAKE") - argument is ready now
// POP  console.log                   - prints the line, returns undefined
// POP  main                          - script finished

function prepare(artist) {
  return "Now playing " + format(artist);
}
function format(artist) {
  return artist.name.toUpperCase();
}
console.log(prepare({ name: "Asake" }));

// Cause an error inside the innermost function: pass an artist with no name
// property, so format's artist.name is undefined, and calling
// .toUpperCase() on undefined throws inside format itself, the innermost
// frame still on the stack at that moment.
//
// This was first run uncaught, exactly as the step asks, to capture the
// real crash and its trace below. It is wrapped in try/catch now only so
// the rest of this file, the later task steps, can keep running afterward;
// the trace itself is unchanged either way, since a try/catch does not
// alter how the stack unwound to produce it, only whether the process
// exits because of it.
try {
  console.log(prepare({}));
} catch (error) {
  console.log(error.stack);
}

// Actual console output from `node lesson-02.js`, captured uncaught:
//
// TypeError: Cannot read properties of undefined (reading 'toUpperCase')
//     at format (lesson-02.js:90:22)
//     at prepare (lesson-02.js:87:27)
//     at Object.<anonymous> (lesson-02.js:98:13)
//
// This matches the diagram, innermost first: format is listed first because
// it is where the throw actually happened and the top of the stack at that
// instant; prepare is listed second because it is format's caller, one
// frame below; the module scope is listed last because it is prepare's
// caller, the bottom of this stack. A stack trace reads as the unwind order
// from the point of failure back down to where the call chain started,
// which is the reverse of the push order in the diagram above.

// ===== Task step 6: countdown with setInterval / clearInterval =====
// Counts 10 down to 0, one tick per second, then stops itself. Proof that
// it actually stopped: nothing more gets logged after 0, which only holds
// if clearInterval runs before the interval has a chance to fire again.

let count = 10;
console.log(count);

const countdownTimer = setInterval(() => {
  count--;
  console.log(count);
  if (count === 0) {
    clearInterval(countdownTimer);
  }
}, 1000);

// ===== STRETCH, step 7: how JS handles a thousand waiting tasks =====
// There's only one call stack, so only one line of code is ever actually
// running at a time. What makes it feel like a lot is happening at once is
// that "waiting" doesn't sit on that stack. When I call fetch, or
// setTimeout, or setInterval, JS basically hands the waiting part off to
// something outside itself, the browser (or in Node's case, its own C++
// side) and immediately moves on to the next line. It doesn't sit there
// blocking like my freeze button did in step 3.
//
// Those outside facilities are the ones actually keeping track of time or
// watching the network. When a timer runs out, or a response comes back,
// they don't just jump into my code and interrupt whatever's running. They
// drop the callback into a queue and wait their turn.
//
// The event loop is the thing that keeps checking: is the call stack empty
// right now? If yes, take the next thing off the queue and push it onto the
// stack. If the stack isn't empty, it just waits and checks again. That's
// why my freeze button mattered so much, the stack was never empty for 3
// seconds straight, so the loop had nothing it could do, no matter how many
// callbacks were sitting in the queue ready to go.
//
// So a thousand waiting timers or requests aren't a thousand things
// happening at once. They're a thousand things sitting outside the stack,
// parked in the browser's facilities, waiting to be lined up in the queue
// one at a time, and the loop just keeps feeding them into the one stack
// whenever it's free. Single thread, but it never has to freeze waiting for
// any one of them, because waiting isn't something the stack has to do.
