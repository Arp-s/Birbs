let allArticles = [];
let activeTags = [];
let activeClades = new Set();
let selectedValue;
let searchQuery = "";

/* =========================
   UTIL
========================= */

function cutAtLastDot(text, limit = 600) {
    if (text.length <= limit) return text;

    const sub = text.slice(0, limit);
    const lastDot = sub.lastIndexOf(".");

    if (lastDot !== -1 && lastDot > 500) {
        return text.slice(0, lastDot + 1);
    }
    return sub + "...";
}

/* =========================
   CLASSIFICATION TREE
========================= */

function buildClassificationTree(data) {
    const tree = {};

    data.forEach(birb => {
        const parts = birb.classification.split("/").slice(1); // ignore Aves
        const [ordre, famille, genre, espece] = parts;

        if (!tree[ordre]) tree[ordre] = {};
        if (!tree[ordre][famille]) tree[ordre][famille] = {};
        if (!tree[ordre][famille][genre]) tree[ordre][famille][genre] = {};

        tree[ordre][famille][genre][espece] = true; // leaf
    });

    return tree;
}

function renderClassificationFilter() {
    const container = document.querySelector(".classification-filter");
    container.innerHTML = "";

    const tree = buildClassificationTree(allArticles);

    Object.entries(tree).forEach(([ordre, familles]) => {
        container.appendChild(createCladeElement(ordre, familles));
    });
}

function createCladeElement(name, children, level = 0) {

    const wrapper = document.createElement("div");
    wrapper.className = "clade level-" + level;

    const header = document.createElement("div");
    header.className = "clade-header";

    const isLeaf = children === true;

    let toggle = null;

    if (!isLeaf) {
        toggle = document.createElement("span");
        toggle.className = "clade-toggle";
        header.appendChild(toggle);
    } else {
        const spacer = document.createElement("span");
        spacer.className = "clade-toggle";
        header.appendChild(spacer);
    }

    const label = document.createElement("label");
    label.className = "tag-label checkbox";

    label.innerHTML = `
        <input type="checkbox" value="${name}">
        <span class="checkmark"></span>
        ${name.replaceAll("_", " ")}
    `;

    const checkbox = label.querySelector("input");

    checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
            activeClades.add(name);
        } else {
            activeClades.delete(name);
        }
        renderArticles();
    });

    header.appendChild(label);
    wrapper.appendChild(header);

    /* ===== CHILDREN ===== */

    if (!isLeaf) {

        const childrenContainer = document.createElement("div");
        childrenContainer.className = "clade-children";

        // règle d’ouverture
        // level 0 = ordre → ouvert
        // level 1 = famille → fermé
        // level 2 = genre → fermé
        const shouldBeOpen = level < 1;

        childrenContainer.style.display = shouldBeOpen ? "block" : "none";
        toggle.textContent = shouldBeOpen ? "▾" : "▸";

        Object.entries(children).forEach(([childName, subChildren]) => {
            childrenContainer.appendChild(
                createCladeElement(childName, subChildren, level + 1)
            );
        });

        toggle.addEventListener("click", () => {
            const isHidden = childrenContainer.style.display === "none";
            childrenContainer.style.display = isHidden ? "block" : "none";
            toggle.textContent = isHidden ? "▾" : "▸";
        });

        wrapper.appendChild(childrenContainer);
    }

    return wrapper;
}

/* =========================
   FILTERS (SEARCH + SORT)
========================= */

function renderFilters() {

    const searchInput = document.querySelector(".search-input");
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderArticles();
    });

    const customSelects = document.querySelectorAll(".custom-select");

    customSelects.forEach((customSelect) => {

        const selectButton = customSelect.querySelector(".select-button");
        const dropdown = customSelect.querySelector(".select-dropdown");
        const options = dropdown.querySelectorAll("li");
        selectedValue = selectButton.querySelector(".selected-value");

        let focusedIndex = -1;

        const toggleDropdown = (expand = null) => {
            const isOpen =
                expand !== null ? expand : dropdown.classList.contains("hidden");

            dropdown.classList.toggle("hidden", !isOpen);
            selectButton.setAttribute("aria-expanded", isOpen);

            if (isOpen) {
                focusedIndex = [...options].findIndex(option =>
                    option.classList.contains("selected")
                );
                focusedIndex = focusedIndex === -1 ? 0 : focusedIndex;
                updateFocus();
            } else {
                focusedIndex = -1;
                selectButton.focus();
            }
        };

        const updateFocus = () => {
            options.forEach((option, index) => {
                option.setAttribute(
                    "tabindex",
                    index === focusedIndex ? "0" : "-1"
                );
                if (index === focusedIndex) option.focus();
            });
        };

        const handleOptionSelect = (option) => {
            options.forEach(opt => opt.classList.remove("selected"));
            option.classList.add("selected");
            selectedValue.textContent = option.textContent.trim();
            renderArticles();
        };

        options.forEach(option => {
            option.addEventListener("click", () => {
                handleOptionSelect(option);
                toggleDropdown(false);
            });
        });

        selectButton.addEventListener("click", () => {
            toggleDropdown();
        });

        dropdown.addEventListener("keydown", (event) => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                focusedIndex = (focusedIndex + 1) % options.length;
                updateFocus();
            } else if (event.key === "ArrowUp") {
                event.preventDefault();
                focusedIndex = (focusedIndex - 1 + options.length) % options.length;
                updateFocus();
            } else if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleOptionSelect(options[focusedIndex]);
                toggleDropdown(false);
            } else if (event.key === "Escape") {
                toggleDropdown(false);
            }
        });
    });
}

/* =========================
   RENDER ARTICLES
========================= */

function renderArticles() {

    const wrapper = document.querySelector(".card-wrapper");
    wrapper.innerHTML = "";

    let filtered = [...allArticles];

    if (searchQuery.length > 0) {
        const words = searchQuery.split(/\s+/);

        filtered = filtered.filter(a => {
            const full = `
                ${a.name_la}
                ${a.name_fr}
                ${a.name_en}
                ${a.date}
                ${a.classification}
                ${a.size}
            `.toLowerCase();

            return words.every(w => full.includes(w));
        });
    }

    if (activeClades.size > 0) {
        filtered = filtered.filter(a => {
            const parts = a.classification.split("/").slice(1);
            return parts.some(part => activeClades.has(part));
        });
    }

    if (!selectedValue) {
        selectedValue = { textContent: "Alphabétique (a-z)" };
    }

    if (selectedValue.textContent === "Date (récent)") {
        filtered.sort((a, b) =>
            new Date(b.date.split("-").reverse().join("-")) -
            new Date(a.date.split("-").reverse().join("-"))
        );
    } else if (selectedValue.textContent === "Date (ancien)") {
        filtered.sort((a, b) =>
            new Date(a.date.split("-").reverse().join("-")) -
            new Date(b.date.split("-").reverse().join("-"))
        );
    } else if (selectedValue.textContent === "Alphabétique (z-a)") {
        filtered.sort((a, b) => b.name_la.localeCompare(a.name_la));
    } else if (selectedValue.textContent === "Taille (croissant)") {
        filtered.sort((a, b) => a.size - b.size);
    } else if (selectedValue.textContent === "Taille (décroissant)") {
        filtered.sort((a, b) => b.size - a.size);
    } else {
        filtered.sort((a, b) => a.name_la.localeCompare(b.name_la));
    }

    filtered.forEach(birb => {

        const card = document.createElement("a");
        card.className = "numero-card";
        card.href = birb.file;

        const image =
            birb.classification + "_" + birb.formes[0] + ".jpg";

        card.innerHTML = `
            <div class="card-title">
                <h2 class="card-name"><span class="i">${birb.name_la}</span></h2>
                <h2 class="card-name">${birb.name_fr}</h2>
                <h2 class="card-name">${birb.name_en}</h2>
            </div>
            <div class="card-line"></div>
            <img class="card-photo" src="${image}" alt="Illustration d'un ${birb.name_fr}">
            <div class="card-meta">
                <p class="card-description">${birb.classification.replaceAll("_", " ")}</p>
                <span class="date">${birb.date}</span>
            </div>
        `;

        wrapper.appendChild(card);
    });
}

function renderNumbers() {
    document.querySelector(".home-title").innerHTML =
        "Birbs : " + allArticles.length + "/700";
}

async function loadArticles() {
    try {
        const response = await fetch("./birbs.json");
        allArticles = await response.json();

        renderFilters();
        renderClassificationFilter();
        renderArticles();
        renderNumbers();

    } catch (err) {
        console.error("Error when loading articles:", err);
        document.querySelector(".card-wrapper").innerHTML =
            `<p class="card-error-message">Error when loading articles</p>`;
    }
}

document.addEventListener("DOMContentLoaded", loadArticles);