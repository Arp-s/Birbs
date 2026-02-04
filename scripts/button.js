const button = document.querySelector(".summary-button");
const link = document.querySelector(".summary-list");
const thumb = document.querySelector(".thumbs");
const out = document.querySelector(".summary-out");
const summaryContainer = document.querySelector(".summary");


button.addEventListener("click", e => {
    button.classList.toggle("active");
    summaryContainer.classList.toggle("open");
});
link.addEventListener("click", e => {   
    button.classList.toggle("active");
    summaryContainer.classList.toggle("open");
});
thumb.addEventListener("click", e => {
    button.classList.toggle("active");
    summaryContainer.classList.toggle("open");
});

out.addEventListener("click", e => {
    button.classList.remove("active");
    summaryContainer.classList.remove("open");
});