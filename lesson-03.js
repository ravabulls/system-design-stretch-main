'use strict';

// Lesson 3: Promises, async, and await.
// Standalone programs and observations go in this file as code and comments.
// The loader work happens in stretch-records/script.js.
//
// Step 2: the Lesson 2 loader in stretch-records/script.js is now wrapped in
// then()/catch()/finally(). then() renders the cards, catch() writes a
// visitor readable message into .status on failure, and finally() clears
// that text, but only when it is still the loading message, so a real error
// from catch() is not wiped out the instant after it appears. Confirmed both
// ways: pointing fetch at a missing file (artists12.json) left the failure
// message on screen instead of it flashing and disappearing, and pointing
// it back at artists.json restored the normal loading, then cards, flow.
//
// Step 3, the ordering puzzle: write a program mixing plain logs, a zero
// delay timer, and a settled Promise reaction. Predict the full output order
// in comments before running, then explain in one sentence why the Promise
// beat the timer.

console.log('one');
setTimeout(() => console.log('two'), 0);
Promise.resolve().then(() => console.log('three'));
console.log('four');
Promise.resolve().then(() => console.log('five'));
setTimeout(() => console.log('six'), 0);

// Your prediction:
// 1. one
// 2. four
// 3. three
// 4. five
// 5. two
// 6. six
//
// Actual output (node lesson-03.js): one, four, three, five, two, six.
// Prediction was correct.
//
// The Promise reactions beat the zero delay timers because they queue on
// two different lines: settled Promises go to the microtask queue, which
// the event loop always drains completely before it takes even one thing
// off the macrotask queue where setTimeout callbacks live, no matter how
// small that timer's delay is.

// Step 4: the loader in stretch-records/script.js was rewritten as an async
// function, loadArtists(). Each then() became an await, catch() became a
// try/catch around the three awaits, and finally still runs either way,
// with the same guard as step 2: only clear the loading text if it is still
// the loading text, so a real error is not wiped out right after it shows.
// The step 2 version is kept there as a comment above it for reference.
//
// Confirmed identical behavior in both cases: the success path still shows
// the loading message, waits out the simulated delay, then renders the six
// cards; the failure path (temporarily pointing fetch at a missing file)
// still shows the same visitor readable message and leaves it on screen
// instead of it flashing and disappearing. Same outward behavior, just
// written to read top to bottom instead of as a chain of callbacks.

// Step 5: a custom error class for missing artist data. checkArtist() is
// the guard: it looks for a name and throws MissingArtistDataError when
// there isn't one. The catch below is written for whoever is debugging the
// data, not for a visitor, so the message names the exact problem and shows
// the offending record, enough to go fix the source file without guessing.

class MissingArtistDataError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MissingArtistDataError';
  }
}

function checkArtist(artist) {
  if (!artist.name) {
    throw new MissingArtistDataError(
      `Artist record is missing a name: ${JSON.stringify(artist)}`
    );
  }
  return artist;
}

// Good record: passes straight through, nothing thrown.
console.log(checkArtist({ name: 'Nina Simone', genre: 'Jazz', total: '18:03' }));

// Bad record: no name, so checkArtist throws.
try {
  checkArtist({ genre: 'Synthwave', total: '12:47' });
} catch (error) {
  if (error instanceof MissingArtistDataError) {
    console.error(`${error.name}: ${error.message}`);
  } else {
    throw error;
  }
}

// Actual console output for the bad record:
// MissingArtistDataError: Artist record is missing a name: {"genre":"Synthwave","total":"12:47"}
//
// That is a message a teammate could act on: it names the error type, says
// exactly what field is missing, and shows the full record, enough to trace
// it back to whichever line of artists.json is broken without guessing.

// Step 6: rethrowing with context. loadRoster wraps checkArtist for the
// whole array. When checkArtist throws, loadRoster catches it, adds where
// this happened (the Stretch Records artist page) and what was being done
// (loading the roster), and throws a new error onward with that context in
// front of the original message.

function loadRoster(artists) {
  try {
    return artists.map((artist) => checkArtist(artist));
  } catch (error) {
    throw new MissingArtistDataError(
      `Stretch Records artist page, loading the roster: ${error.message}`
    );
  }
}

// This was first run letting the error reach the top uncaught, exactly as
// the step asks, to capture the real final message and trace below. It is
// wrapped in try/catch now only so the file exits cleanly; the message
// itself is unchanged either way.
try {
  loadRoster([
    { name: 'Nina Simone', genre: 'Jazz', total: '18:03' },
    { genre: 'Synthwave', total: '12:47' },
  ]);
} catch (error) {
  console.error(error.message);
}

// The final message that reached the top:
// MissingArtistDataError: Stretch Records artist page, loading the roster: Artist record is missing a name: {"genre":"Synthwave","total":"12:47"}
//
// Reading it left to right is reading the rethrow chain outward: the
// innermost part, "Artist record is missing a name...", is checkArtist's
// original message; in front of it is the context loadRoster added, naming
// the page and the operation, before it threw the failure onward.

// Step 7: three independent delayed tasks. delayedValue resolves after ms
// with a value; delayedFailure rejects after ms with a reason, standing in
// for whichever one lookup fails.

function delayedValue(value, ms) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function delayedFailure(reason, ms) {
  return new Promise((resolve, reject) => setTimeout(() => reject(new Error(reason)), ms));
}

// All three succeed: Promise.all waits for every one, then hands back the
// results in the same order the tasks were passed in, not the order they
// finished in.
Promise.all([
  delayedValue('genre: Jazz', 300),
  delayedValue('total: 18:03', 100),
  delayedValue('label: Independent', 200),
]).then((results) => {
  console.log('Promise.all, all succeed:', results);
});

// Now one of the three rejects. Promise.all fails the instant any one task
// rejects, it does not wait for the other two to finish first, and it
// throws away whatever they would have returned.
Promise.all([
  delayedValue('genre: Jazz', 300),
  delayedFailure('label lookup timed out', 100),
  delayedValue('label: Independent', 200),
]).then((results) => {
  console.log('should not print:', results);
}).catch((error) => {
  console.log('Promise.all, one fails:', error.message);
});

// Same three tasks, one still rejecting, but through Promise.allSettled
// instead. It never rejects itself: it waits for all three to finish either
// way and reports every outcome, so the two good results are not thrown
// away just because the third one failed.
Promise.allSettled([
  delayedValue('genre: Jazz', 300),
  delayedFailure('label lookup timed out', 100),
  delayedValue('label: Independent', 200),
]).then((results) => {
  console.log('Promise.allSettled, every outcome:', results);
  const survivors = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);
  console.log('survivors:', survivors);
});

// Actual output:
//
// Promise.all, one fails: label lookup timed out
// Promise.all, all succeed: [ 'genre: Jazz', 'total: 18:03', 'label: Independent' ]
// Promise.allSettled, every outcome: [
//   { status: 'fulfilled', value: 'genre: Jazz' },
//   { status: 'rejected', reason: Error: label lookup timed out },
//   { status: 'fulfilled', value: 'label: Independent' }
// ]
// survivors: [ 'genre: Jazz', 'label: Independent' ]
//
// The failing Promise.all logged first even though it was started after the
// succeeding one, because it only had to wait for its fastest bad news
// (100ms), while the succeeding group had to wait for its slowest task
// (300ms) before it had anything to report. That is the real behavior
// Promise.all promises: it settles the moment the first rejection lands,
// throwing away whatever the other two tasks were going to return, good or
// not. Promise.allSettled never does that. It waits for all three no matter
// what, wraps every result as { status, value } or { status, reason }, and
// leaves it up to the code after it to decide what to do with the mix,
// which is what let the filter above keep the two survivors instead of
// losing them to the one that failed.

// Step 8 (optional): the loader in stretch-records/script.js now has its
// own MissingArtistDataError, same pattern as this file's, for the case
// where artists.json parses fine but comes back as an empty array. When
// that happens, catch shows "There are no artists on the roster right now.
// Please check back soon." instead of the generic network-failure message.
//
// Tested for real: artists.json was temporarily emptied to [], reloaded,
// and that exact message appeared with no cards, then artists.json was
// restored to all six artists and the normal page came back.
//
// Wording, defended: a visitor does not know or care whether the roster is
// empty because of a bug, a bad deploy, or the label genuinely having
// nothing up yet, and telling them "error" would suggest something is
// broken on their end when nothing is. "No artists right now, check back
// soon" is honest about the actual state, does not blame the visitor or
// invite them to retry something that will not fix it (unlike the network
// message, which does suggest a refresh, because that one might actually
// help), and gives them one clear, correct next step.
