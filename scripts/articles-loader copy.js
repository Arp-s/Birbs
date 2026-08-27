let allArticles = [];
let activeTags = [];
let selectedValue;
let searchQuery = "";

// Cutting too long abstracts
function cutAtLastDot(text, limit = 600) {
    if (text.length <= limit) return text;

    const sub = text.slice(0, limit);

    const lastDot = sub.lastIndexOf(".");

    if (lastDot !== -1 && lastDot > 500) { 
        return text.slice(0, lastDot + 1);
    }
    return sub + "...";
}

function renderFilters() {
    // const tags = [...new Set(allArticles.flatMap(a => a.tags))];
    // const tagsContainer = document.querySelector(".tags-container");
    // tagsContainer.innerHTML = "";

    // Search bar
    const searchInput = document.querySelector(".search-input");
    searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderArticles();
    });

    // Sort selector

    const customSelects = document.querySelectorAll(".custom-select");

    customSelects.forEach((customSelect) => {
        const selectButton = customSelect.querySelector(".select-button");
        const dropdown = customSelect.querySelector(".select-dropdown");
        const options = dropdown.querySelectorAll("li");
        selectedValue = selectButton.querySelector(".selected-value");

        let focusedIndex = -1;

        // Make appear and desappear the dropdown
        const toggleDropdown = (expand = null) => {
            const isOpen =
                expand !== null ? expand : dropdown.classList.contains("hidden");
            dropdown.classList.toggle("hidden", !isOpen);
            selectButton.setAttribute("aria-expanded", isOpen);

            if (isOpen) {
                focusedIndex = [...options].findIndex((option) =>
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
                if (option) {
                option.setAttribute("tabindex", index === focusedIndex ? "0" : "-1");
                if (index === focusedIndex) option.focus();
                }
            });
        };

        const handleOptionSelect = (option) => {
            options.forEach((opt) => opt.classList.remove("selected"));
            option.classList.add("selected");
            selectedValue.textContent = option.textContent.trim();

            if (option.dataset.value === "clear") {
                selectedValue.textContent = "Trier alphabétiquement (a-z)";
                options.forEach((opt) => opt.classList.remove("selected"));
                return;
            }
            renderArticles();
        };

        options.forEach((option) => {
            option.addEventListener("click", () => {
                handleOptionSelect(option);
                toggleDropdown(false);
            });
        });

        selectButton.addEventListener("click", () => {
            toggleDropdown();
        });

        selectButton.addEventListener("keydown", (event) => {
            if (event.key === "ArrowDown") {
                event.preventDefault();
                toggleDropdown(true);
            } else if (event.key === "Escape") {
                toggleDropdown(false);
            }
        });

        // Managing keyboard inputs
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

function renderArticles() {
    const wrapper = document.querySelector(".card-wrapper");
    wrapper.innerHTML = "";

    let filtered = allArticles;

    // Search bar
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

    // Sort menu
    console.log(selectedValue.textContent)
    if (selectedValue.textContent === "Trier par date (récent)") {
        filtered.sort((a, b) => new Date(b.date.split("-").reverse().join("-")) -
                                new Date(a.date.split("-").reverse().join("-")));
    } else if (selectedValue.textContent === "Trier par date (ancien)") {
        filtered.sort((b, a) => new Date(b.date.split("-").reverse().join("-")) -
                                new Date(a.date.split("-").reverse().join("-")));
    } else if (selectedValue.textContent === "Trier alphabétiquement (a-z)") {
        filtered.sort((a, b) => a.name_la.localeCompare(b.name_la));
    } else if (selectedValue.textContent === "Trier alphabétiquement (z-a)") {
        filtered.sort((b, a) => a.name_la.localeCompare(b.name_la));
    } else if (selectedValue.textContent === "Trier par taille (croissant)") {
        filtered.sort((a, b) => (a.size-b.size));
    } else if (selectedValue.textContent === "Trier par taille (décroissant)") {
        filtered.sort((b, a) => (a.size-b.size));
    }

    // Cards
    filtered.forEach(birb => {
        const card = document.createElement("a");
        card.className = "numero-card";
        card.href = birb.file;

        const image = birb.classification+"_"+birb.formes[0]+".jpg"

        card.innerHTML = `
            <div class="card-title">
                <h2 class="card-name"><span class="i">${birb.name_la}</span></h2>
                <h2 class="card-name">${birb.name_fr}</h2>
                <h2 class="card-name">${birb.name_en}</h2>
            </div>
            <div class="card-line"></div>
            <img class="card-photo" src="${image}" alt="Illustration d'un ${birb.name_fr}">
            <div class="card-meta">
                <p class="card-description">${birb.classification.replace("_", " ")}</p>
                <span class="date">${birb.date}</span>
            </div>
        `;

        wrapper.appendChild(card);
    });
}

function renderNumbers() {
    document.querySelector(".bird-title").innerHTML = "Birbs : " + allArticles.length + "/700";
}

// Load articles list
async function loadArticles() {
    try {
        const response = await fetch("./birbs.json");
        allArticles = await response.json();

        renderFilters();
        renderArticles();
        renderNumbers();


    } catch (err) {
        console.error("Error when loading articles:", err);
        document.querySelector(".card-wrapper").innerHTML = `<p class="card-error-message">Error when loading articles</p>`;
    }
}

document.addEventListener("DOMContentLoaded", loadArticles);