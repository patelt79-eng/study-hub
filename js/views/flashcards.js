// Flashcards: one card per screen. Show the answer, then say "I knew it" or "Not yet".

import { getSubject } from '../data.js';
import { esc, sayRow, speakBtn, minutes, plural, markSessionFromParams, doneButtons, finishedLine } from '../ui.js';

// 'key' is every key-term card; 'all' is every card; otherwise a named set.
export function cardsInSet(subject, setId) {
  if (setId === 'key') return subject.flashcards.filter(c => c.key);
  if (setId === 'all') return subject.flashcards;
  return subject.flashcards.filter(c => c.set === setId);
}

function face(card, dir) {
  if (card.fr !== undefined) {
    const fr = { text: card.fr, lang: 'fr-FR', label: 'French' };
    const en = { text: card.en, lang: 'en-GB', label: 'English' };
    return dir === 'en-fr' ? [en, fr] : [fr, en];
  }
  return [
    { text: card.front, lang: card.front_lang || 'en-GB', label: 'Question' },
    { text: card.back, lang: card.back_lang || 'en-GB', label: 'Answer' },
  ];
}

export async function flashcardsView(ctx, subjectId, setId) {
  const { main, params } = ctx;
  const s = await getSubject(subjectId);
  const dir = params.get('dir') || (s.flashcard_sets.find(x => x.id === setId) || {}).dir || 'fr-en';
  const setInfo = s.flashcard_sets.find(x => x.id === setId);
  const title = setId === 'key' ? 'Key terms' : setId === 'all' ? 'All cards' : (setInfo ? setInfo.title : 'Flashcards');
  const dirText = s.two_way ? (dir === 'en-fr' ? ' (English to French)' : ' (French to English)') : '';
  const all = cardsInSet(s, setId);

  let deck = all;
  let i = 0;
  let showBack = false;
  let notYet = [];
  let known = 0;
  let round = 1;
  let finished = false;

  function intro() {
    const n = deck.length;
    const t = `There ${n === 1 ? 'is' : 'are'} ${plural(n, 'card')}. It takes about ${minutes(n, 0.5)} minutes. Read the card. Say the answer in your head. Then tap Show the answer.`;
    main.innerHTML = `<h1>${esc(s.name)} flashcards: ${esc(title)}${esc(dirText)}</h1>
      ${sayRow(`<p class="lead">${esc(t)}</p>`, t)}
      <div class="row"><button type="button" class="btn primary" id="start">Start</button></div>`;
    main.querySelector('#start').onclick = () => { i = 0; showCard(); };
  }

  function showCard() {
    const card = deck[i];
    const [front, back] = face(card, dir);
    let html = `<h1>${esc(s.name)} flashcards${round > 1 ? ': Not yet cards' : ''}</h1>
      <p class="step-count">Card ${i + 1} of ${deck.length}</p>
      <div class="card">
        <p class="muted small">${esc(front.label)}</p>
        ${sayRow(`<p class="big-text" lang="${esc(front.lang)}">${esc(front.text)}</p>`, front.text, front.lang)}
      </div>`;
    if (!showBack) {
      html += `<div class="row"><button type="button" class="btn primary" id="show">Show the answer</button></div>`;
    } else {
      html += `<div class="answer-box">
          <p class="muted small">${esc(back.label)}</p>
          ${sayRow(`<p class="big-text" lang="${esc(back.lang)}">${esc(back.text)}</p>`, back.text, back.lang)}
          ${card.note ? `<p class="small">${esc(card.note)}</p>` : ''}
        </div>
        <p>Did you know it?</p>
        <div class="row">
          <button type="button" class="btn primary" id="knew">I knew it</button>
          <button type="button" class="btn" id="notyet">Not yet</button>
        </div>`;
    }
    main.innerHTML = html;
    if (!showBack) {
      main.querySelector('#show').onclick = () => { showBack = true; showCard(); main.querySelector('#knew').focus(); };
      if (i > 0 || round > 1) main.querySelector('#show').focus();
    } else {
      main.querySelector('#knew').onclick = () => next(true);
      main.querySelector('#notyet').onclick = () => next(false);
    }
  }

  function next(knew) {
    if (knew) known++; else notYet.push(deck[i]);
    showBack = false;
    i++;
    if (i < deck.length) showCard();
    else end();
  }

  function end() {
    if (!finished) {
      finished = true;
      markSessionFromParams(params);
    }
    const missed = notYet;
    const summary = round === 1
      ? `You knew ${known} of ${deck.length} cards.`
      : `You went through the Not yet cards again.`;
    let html = `<h1>${esc(s.name)} flashcards</h1>${finishedLine()}
      ${sayRow(`<p>${esc(summary)}</p>`, summary)}`;
    if (missed.length) {
      html += `<p>You can go through the ${plural(missed.length, 'Not yet card')} once more if you want to. This is optional.</p>
        <div class="row"><button type="button" class="btn" id="again">Go through ${plural(missed.length, 'card')} again</button></div>`;
    }
    html += doneButtons(params, subjectId, s.name);
    main.innerHTML = html;
    const again = main.querySelector('#again');
    if (again) again.onclick = () => {
      deck = missed; notYet = []; known = 0; i = 0; round++; showCard();
    };
  }

  if (!all.length) {
    main.innerHTML = `<h1>${esc(s.name)} flashcards</h1><p>There are no cards in this set.</p>`;
    return;
  }
  intro();
}
