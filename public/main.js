window.onload = function() {
    setInterval(refreshStickers, 300000); // 5 minutes in milliseconds
    setInterval(function () {
        getGlobalState();
        getChatMessages();
    }, 3000)
}

let enableSlideshow = true;
let activeSlideshow = true;
let pauseSlideshow = false;
let currentSet = 'true';

function refreshStickers() {
    const fgDiv = document.getElementById('backbaord-fg');
    const bgDiv = document.getElementById('backbaord-bg');
    const fgImg = fgDiv.getElementsByTagName('img')[0];
    const bgImg = bgDiv.getElementsByTagName('img')[0];
    fgImg.src = `/foreground${currentSet !== 'true' ? '-' + currentSet : ''}.png?` + new Date().getTime(); // Add timestamp to avoid caching
    bgImg.src = `/background${currentSet !== 'true' ? '-' + currentSet : ''}.png?` + new Date().getTime(); // Add timestamp to avoid caching
}
function preloadImage(data) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = data.imageUrl;

        img.onload = () => {
            if (data.position) {
                img.style.position = "absolute";
                img.style[data.position.isLeft ? "left" : "right"] = `${data.position.horizontal}px`;
                img.style[data.position.isTop ? "top" : "bottom"] = `${data.position.vertical}px`;
                if (data.rotation)
                    img.style.transform = `rotate(${data.rotation}deg)`;
            }
            resolve(img);
        };

        img.onerror = reject;
    });
}
let frameWidth;
let frameHeight;
async function fetchNextImage() {
    const response = await fetch(`/next-image?width=${frameWidth}&height=${frameHeight}`);
    const data = await response.json();
    const img = await preloadImage(data);
    return { img, orientation: data.orientation, trans: data.hasTransparency };
}
let imageTimer;

const slideshow = document.getElementById('slideshow');
const imageContainer = slideshow.querySelector('.image-container');
const slideshowFull = document.getElementById('slideshow-full');
async function showNextImage() {
    if (!activeSlideshow || !enableSlideshow || pauseSlideshow) {
        clearTimeout(imageTimer);
        imageTimer = setTimeout(showNextImage, 60000);
        return;
    }

    try {
        const { img, orientation, trans } = await fetchNextImage();

        if (!imageContainer) {
            console.error('No image-container found. Ensure the DOM has the required structure.');
            return;
        }

        if (trans) {
            handleTransparentImage(img, orientation);
        } else {
            handleStandardImage(img, orientation);
        }

        // Schedule the next image display
        clearTimeout(imageTimer);
        imageTimer = setTimeout(showNextImage, 60000);
    } catch (error) {
        console.error('Error showing the next image:', error);
    }
}

function handleTransparentImage(img, orientation) {
    imageContainer.classList.remove('active');

    setTimeout(() => {
        imageContainer.innerHTML = ''; // Clear existing standard images
        slideshowFull.innerHTML = ''; // Clear any previous transparent image

        const transparentContainer = document.createElement('div');
        transparentContainer.classList.add('image-container', orientation);
        transparentContainer.style.opacity = 1;
        transparentContainer.appendChild(img);

        slideshowFull.appendChild(transparentContainer);
    }, 250);
}
function handleStandardImage(img, orientation) {
    const images = imageContainer.querySelectorAll('img');

    // Remove oldest image if more than 3 are present
    if (images.length >= 3) {
        const oldestImage = images[0];
        oldestImage.style.opacity = 0;
        setTimeout(() => oldestImage.remove(), 1000);
    }

    // Add new image
    img.className = orientation;
    img.style.opacity = 1;
    imageContainer.appendChild(img);

    // Show the new image
    imageContainer.classList.add('active');

    // Hide the full-screen transparent image container if it exists
    const transparentContainer = slideshowFull.querySelector('.image-container');
    if (transparentContainer) {
        transparentContainer.style.opacity = 0;
    }
}

async function getChatMessages() {
    const response = await fetch('/chat/html');
    const data = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(data, "text/html");
    const holder = document.getElementById('chat-fg');
    const messages = doc.querySelector('div.chat-messages');
    if (messages && messages.innerHTML) {
        holder.innerHTML = messages.innerHTML;
        holder.style.opacity = "1";
        if (doc.querySelector('div.chater-name')) {
            activeSlideshow = false;
            imageContainer.classList.remove('active');
            const transparentContainer = slideshowFull.querySelector('.image-container');
            if (transparentContainer) {
                transparentContainer.style.opacity = 0;
            }
        } else {
            activeSlideshow = true;
        }
    } else {
        holder.innerHTML = '';
        holder.style.opacity = "0";
        if (!activeSlideshow) {
            activeSlideshow = true;
            showNextImage()
        } else {
            activeSlideshow = true;
        }
    }
}
async function getGlobalState() {
    const response = await fetch('/active/setting');
    const data = await response.text();
    if (data !== 'false') {
        if (currentSet !== data) {
            currentSet = data;
            refreshStickers();
        }
        enableSlideshow = true;
    } else {
        enableSlideshow = false;
        imageContainer.classList.remove('active');
        const transparentContainer = slideshowFull.querySelector('.image-container');
        if (transparentContainer) {
            transparentContainer.style.opacity = 0;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const slideshow = document.getElementById('slideshow');
    const computedStyle = window.getComputedStyle(slideshow);

    const paddingLeft = parseFloat(computedStyle.paddingLeft);
    const paddingRight = parseFloat(computedStyle.paddingRight);
    const paddingTop = parseFloat(computedStyle.paddingTop);
    const paddingBottom = parseFloat(computedStyle.paddingBottom);

    frameWidth = slideshow.offsetWidth - paddingLeft - paddingRight;
    frameHeight = slideshow.offsetHeight - paddingTop - paddingBottom;
    showNextImage();
});
