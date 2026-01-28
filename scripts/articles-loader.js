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
    const tags = [...new Set(allArticles.flatMap(a => a.tags))];
    const tagsContainer = document.querySelector(".tags-container");
    tagsContainer.innerHTML = "";

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
                selectedValue.textContent = "Sort by date";
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

        // Close the menu if outside click
        // document.addEventListener("click", (event) => {
        //     const isOutsideClick = !customSelect.contains(event.target);

        //     if (isOutsideClick) {
        //         toggleDropdown(false);
        //     }
        // });
    });
    
    // Tags filter
    tags.forEach(tag => {
        const label = document.createElement("label");
        label.className = "tag-label checkbox";
        label.innerHTML =`<input type="checkbox" value="${tag}"> <span class="checkmark"></span> ${tag}`;

        label.querySelector("input").addEventListener("change", e => {
            if (e.target.checked) activeTags.push(tag);
            else activeTags = activeTags.filter(t => t !== tag);

            renderArticles();
        });

        tagsContainer.appendChild(label);
    });
}

function renderArticles() {
    const wrapper = document.querySelector(".card-wrapper");
    wrapper.innerHTML = "";

    let filtered = allArticles;

    // Tag filter
    if (activeTags.length > 0) {
        filtered = filtered.filter(a =>
            activeTags.every(t => a.tags.includes(t))
        );
    }

    // Search bar
    if (searchQuery.length > 0) {
        const words = searchQuery.split(/\s+/);

        filtered = filtered.filter(a => {
            const full = `
                ${a.title}
                ${a.abstract}
                ${a.date}
                ${a.author}
                ${a.tags.join(" ")}
            `.toLowerCase();

            return words.every(w => full.includes(w));
        });
    }

    // Sort menu
    console.log(selectedValue.textContent)
    if (selectedValue.textContent === "Sort by date") {
        filtered.sort((a, b) => new Date(b.date.split("-").reverse().join("-")) -
                                new Date(a.date.split("-").reverse().join("-")));
    } else if (selectedValue.textContent === "Sort alphabetically") {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
    }

    // Cards
    filtered.forEach(article => {
        const card = document.createElement("a");
        card.className = "numero-card";
        card.href = article.file;

        const dateText =
            !article.last_edit ? article.date :
            `${article.date} ; last edit : ${article.last_edit}`;

        const abstractText = cutAtLastDot(article.abstract);

        card.innerHTML = `
            <div class="card-title">
                <h2 class="card-name">${article.title}</h2>
                <span class="author">${article.author}</span>
            </div>
            <div class="card-line"></div>
            <p class="card-description">${abstractText}</p>
            <div class="card-meta">
                <span class="tags">${article.tags.join(", ")}</span>
                <span class="date">${dateText}</span>
            </div>
        `;

        wrapper.appendChild(card);
    });
}

// Load articles list
async function loadArticles() {
    try {
        const response = await fetch("./articles.json");
        allArticles = await response.json();

        renderFilters();
        renderArticles();
    } catch (err) {
        console.error("Error when loading articles:", err);
        document.querySelector(".card-wrapper").innerHTML = `<p class="card-error-message">Error when loading articles</p>`;
    }
}

document.addEventListener("DOMContentLoaded", loadArticles);
