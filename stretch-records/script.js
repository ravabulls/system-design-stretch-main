"use strict";

// The roster used to sit here as an array, exactly where the JavaScript
// course's finale left it. It now lives in artists.json: the page requests
// the data over the network and renders whatever comes back.

const cardArea = document.querySelector(".cards");

// Every artist currently on the page, whatever the data's source. renderCards
// maintains this list, so the shuffle button and the form keep working no
// matter where the artists came from.
const roster = [];

// One card from one artist: the shared builder, used by the first render
// and by the form below.
function buildCard(artist) {
  const card = document.createElement("article");
  if (artist.photo) {
    const photo = document.createElement("img");
    photo.src = artist.photo;
    photo.alt = `${artist.name}, artist photo`;
    card.append(photo);
  }
  const title = document.createElement("h3");
  title.textContent = artist.name;
  const line = document.createElement("p");
  line.textContent = `${artist.genre}, ${artist.total} of music`;
  card.append(title, line);
  return card;
}

function renderCards(list) {
  for (const artist of list) {
    roster.push(artist);
    cardArea.append(buildCard(artist));
  }
}

// Wait ms milliseconds, then resolve. Turns the artificial slow-connection
// delay from Lesson 2 into a real link in the promise chain below, instead
// of a setTimeout ticking off to the side where then/catch/finally can't
// see it.
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Ask the server for the roster, turn the response body into an array, and
// hand it to the same render rule as before. Step 2's version, wrapped in
// then()/catch()/finally(), kept here as a comment to show the shape this
// grew from.
//
// fetch("artists.json")
//   .then((response) => response.json())
//   .then((artists) => wait(2000).then(() => artists))
//   .then((artists) => {
//     renderCards(artists);
//   })
//   .catch((error) => {
//     statusMessage.textContent =
//       "Sorry, the artist roster could not be loaded. Please refresh the page to try again.";
//     console.error(error);
//   })
//   .finally(() => {
//     if (statusMessage.textContent === "Loading artists…") {
//       statusMessage.textContent = "";
//     }
//   });

// Step 4: the same loader, rewritten as an async function. await replaces
// each then(), try/catch replaces catch(), and finally still runs either
// way, same as it did on the promise chain. Behaves identically to the
// version above in both success and failure, confirmed by testing both.
const statusMessage = document.querySelector(".status");
statusMessage.textContent = "Loading artists…";

// Step 8 (optional): a custom error for the empty roster case, same shape
// as lesson-03.js's MissingArtistDataError. This file runs in the browser
// and that one runs under node, so they cannot share a class, only the
// pattern.
class MissingArtistDataError extends Error {
  constructor(message) {
    super(message);
    this.name = "MissingArtistDataError";
  }
}

async function loadArtists() {
  try {
    const response = await fetch("artists.json");
    const artists = await response.json();
    await wait(2000);
    if (artists.length === 0) {
      throw new MissingArtistDataError(
        "There are no artists on the roster right now. Please check back soon."
      );
    }
    renderCards(artists);
  } catch (error) {
    // A visitor does not need to know this was a fetch, a parse, or an
    // empty array, only what it means for them. The empty roster gets its
    // own message, honest about there being nothing to show right now
    // rather than implying something broke, and it tells them what to do
    // next, check back later, instead of leaving a blank space with no
    // explanation. Anything else, a bad network or malformed data, still
    // gets the generic message, since a visitor cannot act on the
    // difference between those two failures anyway.
    statusMessage.textContent =
      error instanceof MissingArtistDataError
        ? error.message
        : "Sorry, the artist roster could not be loaded. Please refresh the page to try again.";
    console.error(error);
  } finally {
    // Same rule as step 2: only clear the text if it is still the loading
    // message, so a real error from catch is not wiped out right after it
    // appears.
    if (statusMessage.textContent === "Loading artists…") {
      statusMessage.textContent = "";
    }
  }
}

loadArtists();

// Shuffle: pick a random artist and feature them.
const shuffleButton = document.querySelector(".shuffle");

shuffleButton.addEventListener("click", () => {
  if (roster.length === 0) return;
  const pick = roster[Math.floor(Math.random() * roster.length)];
  document.querySelector(".featured").textContent =
    `Featured today: ${pick.name}`;
});

// Freeze: a deliberately blocking loop, for Lesson 2 step 3 only. It does not
// await or yield, so it holds the single call stack for its whole run.
// Nothing else, not a click, not a repaint, not a timer, can happen until it
// returns control. Kept as a comment after the freeze was observed; see
// lesson-02.js for what happened while it ran.
//
// const freezeButton = document.querySelector('.freeze');
//
// freezeButton.addEventListener('click', () => {
//   const start = Date.now();
//   while (Date.now() - start < 3000) {
//     // busy-wait: burn CPU on purpose, hand nothing back to the event loop
//   }
//   console.log('freeze done');
// });

// The suggestion form: an empty submission does nothing, because an empty
// string is falsy.
const form = document.querySelector(".signup");
const nameInput = document.querySelector("#artist-name");
const genreInput = document.querySelector("#artist-genre");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = nameInput.value;
  if (name) {
    const genre = genreInput.value || "Unsigned";
    renderCards([{ name: name, genre: genre, total: "0:00" }]);
    nameInput.value = "";
    genreInput.value = "";
  }
});
