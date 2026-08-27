// -----Quiz state ----- //

let birds = [];             // full birbs.json dataset
let currentBird = null;     // bird being asked in the current question
let currentForme = null;    // photo variant ("adulte", "vol", ...) being shown
let currentButtons = [];    // [{ bird, btn }] for the options of the current question
let answered = false;       // true once the user has clicked an option
let correctCount = 0;       // correct answers given this session
let totalCount = 0;         // questions answered this session

// Max number of the last-asked birds kept out of the draw, and the list itself
// (most recent id first). Once it reaches HISTORY_SIZE, adding a new id drops
// the oldest one (the 50th), which then becomes eligible to be drawn again.
const HISTORY_SIZE = 50;
let recentBirdIds = [];

// Delay (ms) before automatically moving to the next question after an answer
const AUTO_NEXT_DELAY = 1500;

// French display labels for forme codes that need an accent / different wording
// than their raw value in birbs.json (e.g. "juvenile" -> "juvénile")
const FORME_LABELS = { juvenile: "juvénile", vol: "en vol" };

// ----- DOM references ----- //
const imageEl = document.getElementById("quiz-image");
const optionsEl = document.getElementById("quiz-options");
const feedbackEl = document.getElementById("quiz-feedback");
const scoreCorrectEl = document.getElementById("score-correct");
const scoreTotalEl = document.getElementById("score-total");

// ----- Bootstrap: load the bird database, then start the quiz ----- //

fetch("birbs.json")
    .then(res => res.json())
    .then(data => {
        birds = data;
        newQuestion();
    })
    .catch(err => {
        feedbackEl.textContent = "Impossible de charger les données des oiseaux.";
        console.error("Failed to load birbs.json:", err);
    });

// Return the nice French label for a forme code, falling back to the raw value
function formatForme(forme) {
    return FORME_LABELS[forme] || forme;
}

// Record a bird as just asked: push its id to the front of the history and,
// once it grows past HISTORY_SIZE, drop everything past the 50th (oldest) entry
function rememberBird(id) {
    recentBirdIds.unshift(id);
    if (recentBirdIds.length > HISTORY_SIZE) {
        recentBirdIds.length = HISTORY_SIZE;
    }
}

// ----- Helpers ----- //

// Pick one random element from an array
function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

// Fisher-Yates shuffle, returns a new shuffled array (does not mutate input)
function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Split a "classification" path into its taxonomic ranks.
// e.g. "Aves/Passeriformes/Corvidae/Corvus/Corvus_corax"
//   -> { classe: "Aves", ordre: "Passeriformes", famille: "Corvidae", genre: "Corvus" }
function parseClassification(classification) {
    const parts = classification.split("/");
    return {
        classe: parts[0],
        ordre: parts[1],
        famille: parts[2],
        genre: parts[3]
    };
}

// Pick 3 "wrong" birds as close as possible to the target species:
// same genus first, then same family, then same order, then anything left.
function pickDistractors(target) {
    const targetTaxo = parseClassification(target.classification);
    const others = birds.filter(b => b.id !== target.id);

    const chosen = [];
    const usedIds = new Set();

    // Add random, not-yet-used birds from `pool` until `chosen` reaches `count`
    function fillFrom(pool, count) {
        if (chosen.length >= count) return;
        const candidates = shuffle(pool.filter(b => !usedIds.has(b.id)));
        for (const b of candidates) {
            if (chosen.length >= count) break;
            chosen.push(b);
            usedIds.add(b.id);
        }
    }

    const sameGenus = others.filter(b => parseClassification(b.classification).genre === targetTaxo.genre);
    const sameFamily = others.filter(b => parseClassification(b.classification).famille === targetTaxo.famille);
    const sameOrder = others.filter(b => parseClassification(b.classification).ordre === targetTaxo.ordre);

    fillFrom(sameGenus, 3);   // 1. closest: same genus
    fillFrom(sameFamily, 3);  // 2. then: same family
    fillFrom(sameOrder, 3);   // 3. then: same order
    fillFrom(others, 3);      // 4. fallback: any other bird

    return chosen.slice(0, 3);
}

// Build the image path for a bird + forme, e.g.
// "Aves/Anseriformes/Anatidae/Anas/Anas_platyrhynchos" + "adulte"
//   -> "Aves/Anseriformes/Anatidae/Anas/Anas_platyrhynchos_adulte.jpg"
function buildPhotoPath(bird, forme) {
    return `${bird.classification}_${forme}.jpg`;
}

// ----- Question lifecycle ----- //

// Start a new question: pick a random bird + forme, build the 4 options, render everything
function newQuestion() {
    answered = false;
    feedbackEl.textContent = "";
    feedbackEl.className = "quiz-feedback";

    // Draw among birds not asked in the last HISTORY_SIZE questions
    // (falls back to the full list if the pool were ever empty, e.g. a very small birbs.json)
    const pool = birds.filter(b => !recentBirdIds.includes(b.id));
    currentBird = randomFrom(pool.length > 0 ? pool : birds);
    rememberBird(currentBird.id);

    currentForme = randomFrom(currentBird.formes);

    imageEl.src = buildPhotoPath(currentBird, currentForme);
    imageEl.alt = `Photo d'un oiseau à identifier (forme : ${currentForme})`;

    const distractors = pickDistractors(currentBird);
    const options = shuffle([currentBird, ...distractors]);

    renderOptions(options);
}

// Render the 4 answer buttons for the given list of candidate birds
function renderOptions(options) {
    optionsEl.innerHTML = "";
    currentButtons = [];

    options.forEach(bird => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "quiz-option";
        btn.innerHTML = `
            <span class="option-fr">${bird.name_fr}</span>
            <span class="option-la i">${bird.name_la}</span>
            <span class="option-en">${bird.name_en}</span>
        `;
        btn.addEventListener("click", () => handleAnswer(bird, btn));

        optionsEl.appendChild(btn);
        currentButtons.push({ bird, btn });
    });
}

// Handle the user's answer: show feedback, update score, lock the options
function handleAnswer(selectedBird, btnEl) {
    if (answered) return; // ignore clicks once a question has already been answered
    answered = true;
    totalCount++;

    const isCorrect = selectedBird.id === currentBird.id;

    if (isCorrect) {
        correctCount++;
        // e.g. "Bonne réponse ! Mésange charbonnière juvénile"
        feedbackEl.textContent = `Bonne réponse ! ${currentBird.name_fr} ${formatForme(currentForme)}`;
        feedbackEl.classList.add("correct");
        btnEl.classList.add("correct");
    } else {
        feedbackEl.textContent = `Faux ! C'était : ${currentBird.name_fr} ${formatForme(currentForme)} (${currentBird.name_la})`;
        feedbackEl.classList.add("incorrect");
        btnEl.classList.add("incorrect");

        // Also highlight the actual correct option among the 4 choices
        const correctEntry = currentButtons.find(entry => entry.bird.id === currentBird.id);
        if (correctEntry) correctEntry.btn.classList.add("correct");
    }

    updateScore();

    // Lock all options so the user can't answer twice
    currentButtons.forEach(entry => entry.btn.classList.add("disabled"));

    // Automatically load the next question, no button needed
    setTimeout(newQuestion, AUTO_NEXT_DELAY);
}

// Refresh the score counters displayed above the quiz card
function updateScore() {
    scoreCorrectEl.textContent = correctCount;
    scoreTotalEl.textContent = totalCount;
}