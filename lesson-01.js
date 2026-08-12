"use strict";

// Lesson 1: The Client and Server Model.
// Your standalone code and written observations for this lesson live here,
// as code and comments. The site work happens in the stretch-records folder.
//
// Step 4: how many requests did the single page load make? List three by name.
//The page load made 11 requests. Three of them were:index.html, style.css, script.js
// Step 6: which files changed when you added the sixth artist, which did not,
// and why is that separation the point?
//
// Only artists.json changed. script.js, index.html and styles.css did not
// change at all, yet a sixth card appeared on reload. That separation is the
// point: the data and the code that displays it now live in different files.
// The code is a rule that renders whatever list it is given; the JSON is the
// material the rule runs on. The roster can grow or shrink without anyone
// touching the rendering logic, and the logic can improve without anyone
// touching the data.
//
// Step 7: paste the console error the broken artists.json produced.
//
// Uncaught (in promise) SyntaxError: Unexpected token ']', ...":47"
// },
// ]
// " is not valid JSON

// Step 8: build one artist object, JSON.stringify() it, log the text,
// JSON.parse() it back, and log one property of the result.

const artist = {
  name: "Nina Simone",
  genre: "Jazz",
  total: "18:03",
};

const asText = JSON.stringify(artist);
console.log(asText);

const backAgain = JSON.parse(asText);
console.log(backAgain.name);

// The object became plain text, the text became an object again, and the
// property survived the round trip. stringify is the packing direction,
// parse is the unpacking direction; response.json() in script.js is doing
// the parse half on whatever text the server sent back.
//
// STRETCH, step 9: describe your page as a system. Name the client, name the
// server, and state what the request asked for and what the response carried.
//
// The client is Chrome, running the page's JavaScript. The server is Live
// Server, listening on port 5500 on my machine. When the page loaded,
// fetch('artists.json') sent an HTTP GET request asking for that one file,
// and the response carried a status code saying the request succeeded plus
// the file's text as its body. response.json() parsed that text into the
// array renderCards() consumed. Both halves run on the same laptop, but they
// are still two parties playing two roles: one asked, one answered, and the
// page is what that conversation produced.
