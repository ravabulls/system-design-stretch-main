'use strict';

// The roster used to sit here as an array, exactly where the JavaScript
// course's finale left it. It now lives in artists.json: the page requests
// the data over the network and renders whatever comes back.

const cardArea = document.querySelector('.cards');

// Every artist currently on the page, whatever the data's source. renderCards
// maintains this list, so the shuffle button and the form keep working no
// matter where the artists came from.
const roster = [];

// One card from one artist: the shared builder, used by the first render
// and by the form below.
function buildCard(artist) {
  const card = document.createElement('article');
  if (artist.photo) {
    const photo = document.createElement('img');
    photo.src = artist.photo;
    photo.alt = `${artist.name}, artist photo`;
    card.append(photo);
  }
  const title = document.createElement('h3');
  title.textContent = artist.name;
  const line = document.createElement('p');
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

// Ask the server for the roster, turn the response body into an array,
// and hand it to the same render rule as before.
fetch('artists.json')
  .then((response) => response.json())
  .then((artists) => renderCards(artists));

// Shuffle: pick a random artist and feature them.
const shuffleButton = document.querySelector('.shuffle');

shuffleButton.addEventListener('click', () => {
  if (roster.length === 0) return;
  const pick = roster[Math.floor(Math.random() * roster.length)];
  document.querySelector('.featured').textContent =
    `Featured today: ${pick.name}`;
});

// The suggestion form: an empty submission does nothing, because an empty
// string is falsy.
const form = document.querySelector('.signup');
const nameInput = document.querySelector('#artist-name');
const genreInput = document.querySelector('#artist-genre');

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const name = nameInput.value;
  if (name) {
    const genre = genreInput.value || 'Unsigned';
    renderCards([{ name: name, genre: genre, total: '0:00' }]);
    nameInput.value = '';
    genreInput.value = '';
  }
});
