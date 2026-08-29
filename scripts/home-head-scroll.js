// Hide the sticky header when scrolling down, reveal it when scrolling up
(() => {
    const scrollContainer = document.querySelector('.home-page');
    const head = document.querySelector('.home-page .home-head');
    if (!scrollContainer || !head) return;

    let lastScrollTop = 0;
    const threshold = 8; // ignore tiny scroll jitters (trackpad, mobile bounce...)

    scrollContainer.addEventListener('scroll', () => {
        const currentScroll = scrollContainer.scrollTop;
        const delta = currentScroll - lastScrollTop;

        if (Math.abs(delta) < threshold) return;

        if (delta > 0 && currentScroll > head.offsetHeight) {
            // scrolling down, past the header's own height: hide it
            head.classList.add('home-head-hidden');
        } else {
            // scrolling up, or still within the header's height: show it
            head.classList.remove('home-head-hidden');
        }

        lastScrollTop = currentScroll;
    }, { passive: true });
})();