// Controls the mobile side navigation panel (".side-page") via the
// top-left toggle button (".side-toggle").
// Both elements share an "open" class: CSS handles all the animation
// (panel slide-in, button slide, chevron -> cross morph). This script
// only flips that class on click and keeps aria attributes in sync.

const sideToggle = document.getElementById("side-toggle");
const sidePage = document.getElementById("side-page");

if (sideToggle && sidePage) {
    sideToggle.addEventListener("click", () => {
        const isOpen = sidePage.classList.toggle("open");
        sideToggle.classList.toggle("open", isOpen);

        sideToggle.setAttribute("aria-expanded", String(isOpen));
        sideToggle.setAttribute("aria-label", isOpen ? "Fermer le menu" : "Ouvrir le menu");
    });
}