# Lesson 5: The System Audit

The written audit of your running system. Every claim must be backed by
something you observed in the Network tab, the console, or the server's
terminal output.

## Single point of failure

The json-server process serving `artists.json` on port 3000 was stopped
while the page was open, then the page was reloaded, with the second
server (`label.json` on port 3001) left running the whole time.

What the visitor saw: the "Loading artists…" message, then it was replaced
by "Sorry, the artist roster could not be loaded. Please refresh the page
to try again." No cards rendered. The suggestion form and its inputs stayed
present and usable, since those are static markup, not data from either
server.

What the console showed:

```
GET http://localhost:3000/artists net::ERR_CONNECTION_REFUSED
TypeError: Failed to fetch
    at loadPage (script.js:104:7)
    at script.js:166:1
```

The single point of failure: the artists server on port 3000. But the
observed damage was wider than the roster alone. The header's label-info
line ("Berlin · Founded 2019 · …", sourced from the label server on 3001)
never appeared either, even though that server was confirmed still running
and answering the whole time. `loadPage()` fetches both servers together
inside one `Promise.all()`, and `Promise.all()` rejects as soon as any one
of its promises rejects, discarding whatever the others would have
returned. So one server going down did not just fail its own data, it
failed the entire page's data, including a piece that had nothing wrong
with it. One process, on one port, was load-bearing for two logically
separate features.

What redundancy would mean here, in one sentence: running the artist data
behind more than one server instance (or serving a last-known-good cached
copy on failure) so that one process dying does not take down every
feature that happens to load through the same `Promise.all()`, not just
the feature that actually depends on it.

## Latency

The Network tab's throttling dropdown was set from "No throttling" to
"Slow 3G" and the page reloaded. The Network panel reported the load
finishing at 10.43 seconds.

What held the screen while waiting: the static header, intro text, and
suggestion form all painted immediately, since those come from
`index.html` and never touch the network. Under the roster heading, though,
it was the "Loading artists…" message the whole 10.43 seconds, not a blank
space and not a partial render, because `loadPage()` does not draw
anything from either server until both `fetch` calls have resolved and the
simulated 2 second delay has also finished.

That 10.43 seconds is latency: the delay between the browser asking for a
resource and a usable response actually arriving, not a measure of how
much data moved. Slow 3G throttles both round-trip delay and bandwidth
together, so part of that number is genuinely how long the request took to
even reach the server and come back under a slower simulated connection,
and part of it is this page's own artificial 2 second wait stacking on top
of that, two separate sources of delay adding together into one number the
visitor cannot tell apart just by watching the loading message.

## Caching

Still throttled to Slow 3G. Two reloads compared, "Disable cache" unchecked
first, then checked, same 28 requests both times.

Cache enabled (unchecked): Finish 10.44 s, 920 kB transferred, 1.5 MB
resources. The five artist photos (`pinkfong.jpg`, `adriano-celentano.jpg`,
`asake.jpg`, `miyagi-and-andy-panda.jpg`, `johnny-cash.jpg`) all came back
**304 Not Modified**, 0.2 kB each, instead of their real file size. One
font file, `UcC73FwrK...woff2`, showed **(memory cache)** in the Size
column with a **0 ms** Time, no network round trip at all.

Cache disabled (checked): Finish 21.60 s, 1.5 MB transferred, the same
1.5 MB resources, meaning almost nothing was reused this time. The same
five photos now came back **200 OK** at their real sizes (102 kB, 167 kB,
86.3 kB, 60.0 kB, 129 kB), each taking 8 to 13 seconds under the throttle.
The same font file that was a 0 ms memory cache hit a moment ago now cost
48.3 kB and 3.13 s, fetched fresh over the network.

One thing that did not change either way: the `artists` and `label` fetch
requests, 1.3 kB and 0.5 kB, took roughly the same ~2 seconds in both
passes. json-server is not sending caching headers that would let the
browser reuse either response, so those two requests pay full network cost
on every single load, cache setting or not, while the static files around
them do not.

That difference, the same resource answered instantly from a local copy
instead of paying for a full round trip and a full transfer, is caching.
It did not reduce how many requests the page made, both reloads made all
28, it reduced how much of that traffic had to actually leave the machine.
A 304 still cost a round trip to ask "has this changed", so under high
latency it does not save the request itself, only the bytes; a memory
cache hit skipped the network entirely and cost nothing.

(Aside: a large share of the request list in both screenshots, files like
`FloatingActionButton.js`, `google-docs-fte.js`, `AdobeClean-Regular.otf`,
`sidePanelUtil.js`, was not part of this app at all, it was an installed
browser extension injecting into every page load. Left in the total counts
above since they were genuinely part of both captures, but worth naming
honestly rather than presenting as if Stretch Records itself made those
requests.)

## The layers

**Presentation.** `index.html` and `styles.css`, plus the pieces of
`script.js` that only ever touch the DOM: `buildCard()`, `renderCards()`,
and the lines that write into `statusMessage.textContent` and
`labelInfo.textContent`. This is everything the visitor actually sees:
cards, the loading message, the error message, the label line, the form.
It has no opinion about where the data came from, only how to show it once
it exists.

**Data.** `artists.json` and `label.json` on disk, plus the two
`json-server` processes (ports 3000 and 3001) that read and write them
over HTTP. This is the actual roster and label info, and the thing that
persisted the POST from Lesson 4's step 6 across a reload and a second
tab.

**Application, and the honest part.** The pieces of `script.js` that make
decisions: `loadPage()` deciding to fetch both servers together, checking
`response.ok` on each, deciding which message a failure deserves,
`MissingArtistDataError` for the empty-roster case, the form handler
deciding what to POST and when. This is real application logic, it is just
not sitting where "middle layer" usually implies. `json-server` looks like
a backend because it answers HTTP requests, but it runs none of this
project's own logic; it has no validation, no notion of who is submitting,
no rule beyond "write whatever JSON arrives to the file." Every actual
decision this system makes, what counts as a failure, what a visitor is
told, whether an empty roster is different from a broken server, is made
in `script.js`, which runs in the browser. So the honest layer count here
is two real ones, presentation and data, with the application layer's
logic present but living inside the presentation layer's own execution
environment, not on a server of its own. There is no process in this
system whose job is to enforce rules about the data before it is written;
`json-server` will accept anything shaped enough to be JSON.

## One request's full journey

Tracing the `pinkfong.jpeg` card end to end, using only the Network tab
rows already captured above and the artists server's own terminal output.

The server's terminal, from when it started, reads:

```
JSON Server started on PORT :3000
Watching artists.json...
Endpoints:
http://localhost:3000/artists
```

That is the only evidence json-server's terminal actually gives, it never
logs individual requests, but it does confirm which file on disk is behind
that one endpoint before any request is ever made.

1. The browser loads `http://127.0.0.1:5500/stretch-records/index.html`
   from Live Server, runs `script.js`, and reaches `loadPage()`.
2. `loadPage()` calls `fetch("http://localhost:3000/artists")`. The
   Network tab shows this row as `artists`, initiator `script.js:104`,
   type `fetch`, status `200`.
3. That `200` is json-server reading the exact file the terminal said it
   was watching, `artists.json`, and answering with its current contents,
   an array that includes the Pinkfong record, `photo:
   "images/pinkfong.jpeg"` among its fields.
4. `const artists = await artistsResponse.json()` turns that response body
   into a real array. `renderCards(artists)` loops over it and calls
   `buildCard(artist)` for the Pinkfong entry.
5. `buildCard()` builds an `<article>`, and because `artist.photo` is
   truthy, an `<img src="images/pinkfong.jpeg">` inside it, appended to
   `.cards` in the DOM.
6. That `src` attribute is itself a second, separate request, visible as
   its own row in the Network tab: `pinkfong.jpg`, type `jpeg`, initiator
   `script.js:20` (inside `buildCard`). Two different captures showed two
   different outcomes for this exact request: `304`, `0.2 kB` when the
   browser already had a copy to revalidate, and `200`, `102 kB`, `11.14 s`
   under Slow 3G with the cache disabled, when it had to be fetched in
   full.
7. Once that image request resolves, the browser paints the actual photo
   into the `<img>` already sitting in the DOM, and the Pinkfong card is
   complete on screen.

One address, `/artists`, but the rendered card was never the product of a
single request; it took one request for the data that named the image and
a second, independent request for the image itself, the second one only
ever firing because the first one's response put that filename into the
DOM in the first place.

## STRETCH: what a real system would need that json-server skipped

**Validation.** Checking that submitted data is actually usable before it
is written, a name that is not empty, a genre that is not garbage, fields
of a sane length. `script.js`'s form handler has exactly one check,
`if (name)`, and it lives in the presentation layer, running in the
visitor's own browser. json-server enforces nothing of its own. This is
the one Lesson 4 directly disproved, not just architecturally, but by
actually doing it: a raw `curl -X POST` straight to
`http://localhost:3000/artists`, with a body built by hand, never touched
`script.js`, never touched the form, and json-server still answered `201`
and wrote it to `artists.json`. The browser's `if (name)` check is not a
rule the system enforces, it is a courtesy the form extends to whoever
happens to be using it through the page; anyone who skips the page
entirely skips the check with it. Real validation belongs in the
application layer, on the server, where a request has to pass it no
matter what client sent it.

**Identity.** Knowing who submitted something. This system has no concept
of it at all, nothing in the POST body or the request says which visitor
sent it, and nothing was ever tested that could prove otherwise, because
there is nothing there to test. Identity would sit between the
presentation and data layers, an application-layer concern, a server
deciding whether to trust a request based on something the browser alone
cannot be allowed to assert about itself.

**Rules.** Constraints beyond "is this field present," things like
whether a name can be added twice, whether `artistCount` should track the
real roster size, whether an artist can be removed by whoever added them
or by anyone. None of that exists here either; json-server's whole job is
to accept anything shaped enough to be valid JSON and persist it, which is
exactly why the curl test above worked at all. Rules, like validation,
belong in the application layer, and for the same reason, a browser can
suggest a rule to a well-behaved visitor, but it cannot enforce one against
a request that was never made through it.
