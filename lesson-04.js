'use strict';

// Lesson 4: HTTP and the Fetch API.
// Recorded observations go in this file as comments. The loader and form
// work happens in stretch-records/script.js, against the server you run
// with json-server.
//
// Step 2: artists.json was wrapped in an object under one "artists" key, so
// json-server has a name to build the endpoint from, then served with
// npx json-server artists.json --port 3000.
//
// GET http://localhost:3000/artists -> 200 OK, Content-Type: application/json
// GET http://localhost:3000/nope    -> 404 Not Found, Content-Type: application/json
//
// Both status codes and the Content-Type: json-server answers every
// request in JSON, whether the resource exists or not. The status code is
// what actually tells success from failure; the Content-Type only says how
// to read the body, not whether the request succeeded.
//
// Step 3: the loader in stretch-records/script.js now fetches
// http://localhost:3000/artists instead of the static file, still handing
// the result to the same buildCard/renderCards, unchanged. The Response
// object was logged before parsing it, both in the console and confirmed
// against the Network tab's own Headers panel for the same request:
//
// ok: true
// status: 200
// Access-Control-Allow-Origin: *
//
// The page is served by Live Server on one origin (127.0.0.1:5500) and the
// data comes from json-server on another (localhost:3000), so this really
// is a cross-origin request; that Access-Control-Allow-Origin header is
// the server's own permission slip letting the browser hand the response
// back to a page it did not originate from. Without it, ok and status would
// never even be reachable, the browser would block the response before
// script.js got the chance to read it.
//
// Step 4: prove the trap. Fetch the wrong path from step 2 and log whether
// the Promise actually rejects, or fulfills anyway.

fetch('http://localhost:3000/nope')
  .then((response) => {
    console.log('fetch fulfilled. ok:', response.ok, 'status:', response.status);
  })
  .catch((error) => {
    console.log('fetch rejected:', error.message);
  });

// Actual output: fetch fulfilled. ok: false status: 404
//
// The Promise fulfilled anyway. .then() ran, not .catch(), even though the
// server answered with a failure. fetch only rejects on a genuine network
// problem, DNS failure, connection refused, offline, never on an HTTP
// error status. A 404, a 500, any of them still count as a successful
// round trip as far as the Promise is concerned; the server answered, it
// just answered "no." That is the trap: code that assumes .catch() covers
// every failure will walk straight past a 404 and try to use a response
// that was never actually the data it wanted, which is exactly why the ok
// check below exists, to turn "answered but failed" into an error the code
// actually reacts to.
//
// The ok check was then added to loadArtists() in stretch-records/script.js,
// right after the response comes back and before it gets parsed:
//
// if (!response.ok) {
//   throw new Error(`Request to ${artistsEndpoint} failed with status ${response.status}`);
// }
//
// Tested on the real page: pointed artistsEndpoint at the wrong path,
// reloaded, and got the loading message followed by the friendly on page
// error, no cards, instead of the page trying and failing to render
// whatever error body the server sent back. Restored artistsEndpoint to
// /artists and reloaded again; all six cards returned normally.
//
// Step 5: the loader was already wrapped in try/catch/finally back in
// Lesson 3, so this step was about proving that wrapping covers a failure
// the 404 test never touched. The server was stopped outright
// (Stop-Process on the process holding port 3000) and the page reloaded.
//
// The visitor still saw the same on page message as the 404 case, "Sorry,
// the artist roster could not be loaded. Please refresh the page to try
// again.", and the loading text still cleared, no stuck spinner, because
// finally still runs regardless of which kind of failure catch caught.
//
// But the console told a different story underneath that identical message:
//
// Failed to load resource: net::ERR_CONNECTION_REFUSED
// TypeError: Failed to fetch
//     at loadArtists (script.js:93:28)
//
// How the refused connection differed from the 404: the 404 was a
// fulfilled Promise carrying a real Response, ok: false, status: 404, the
// server answered, it just said no. The refused connection never got a
// Response at all; fetch itself rejected with a TypeError, because there
// was no server left to answer, nothing to attach a status to. Two
// different failures, one server-side and one network-level, but the same
// catch block handled both, which is exactly why checking response.ok
// alone would never have been enough; a request that never gets a response
// object needs the try/catch around it, not just an ok check inside it.
//
// Step 6: the suggestion form now sends a real POST to
// http://localhost:3000/artists, with a Content-Type: application/json
// header and a JSON.stringify()'d body, instead of only adding a card
// locally. Confirmed end to end: submitting "Mashan and the blaze",
// genre "synthetic", logged POST status: 201 in the console, the card
// appeared, and it was still there after a full page reload, proof it
// actually reached the server rather than living only in that one tab's
// memory. Opened a second tab to the same page and the same artist showed
// up there too, on a fresh load with no shared state between tabs except
// the server, which is the whole point: two different clients, one
// server, one shared answer.
//
// Step 7: a second, independent json-server was started for label.json,
// npx json-server label.json --port 3001. label.json's top level is a
// single object, not an array, so it is served as one resource at /label,
// GET http://localhost:3001/label returning the object itself, not wrapped
// again. loadPage() now fetches both servers together with Promise.all,
// which waits for both requests before either the header's label line or
// the roster's cards render, so the page never shows one without the
// other, half loaded.
//
// Confirmed on reload: the header now shows "Berlin · Founded 2019 ·
// "Hear it before the algorithm does."" underneath the Stretch Records
// brand, sourced from the second server, appearing together with the
// artist cards after the same simulated delay, not one before the other.

// STRETCH, step 8: read before writing any code. Source: MusicBrainz API
// docs (musicbrainz.org/doc/MusicBrainz_API and the linked Search page).
//
// Endpoint address: https://musicbrainz.org/ws/2/artist (artist search and
// lookup both hang off this same ws/2 base, other entities get their own
// path under it, e.g. /ws/2/release).
//
// Method: GET, for both looking up one artist by MBID and searching by
// name.
//
// One parameter: fmt=json on the query string, e.g.
// ws/2/artist?query=asake&fmt=json, otherwise the API answers in XML by
// default.
//
// Response shape to code against, for a search:
// { created, count, offset, artists: [ ... ] }
// artists is the array to actually iterate, the same shape a page like
// this one would map over with buildCard; count and offset exist for
// paging through results larger than one page.
//
// One stated limit: no more than one request per second per client
// application, and a real, identifying User-Agent header is required on
// every request; exceeding the rate limit risks the calling IP getting
// blocked. That is a hard constraint this page's artist roster fetches
// never had to think about, hitting a shared public service is not the
// same as hitting your own json-server.
