const button = document.querySelector(".summary-button");
const out = document.querySelector(".summary-out");
const colorPickerContainer = document.querySelector(".summary");


button.addEventListener("click", e => {
    button.classList.toggle("active");
    colorPickerContainer.classList.toggle("open");
});

out.addEventListener("click", e => {
    button.classList.remove("active");
    colorPickerContainer.classList.remove("open");
});