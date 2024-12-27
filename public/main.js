let enableSlideshow = true;
let activeSlideshow = true;
let pauseSlideshow = false;
let frameWidth;
let frameHeight;
let imageTimer;
let init = false;

const slideshow = document.getElementById('slideshow');
const imageContainer = slideshow.querySelector('.image-container');
const slideshowFull = document.getElementById('slideshow-full');
const layer00 = document.getElementById('layer00');
const layer01 = document.getElementById('layer01');
const layer02 = document.getElementById('layer02');

window.onload = function() {
    getGlobalState();
    getChatMessages();

    setInterval(refreshStickers, 300000); // 5 minutes in milliseconds
    setInterval(function () {
        getGlobalState();
        getChatMessages();
    }, 3000)
}

let currentSet = '00';
function refreshStickers() {
    const fgImg = layer02.getElementsByTagName('img')[0];
    const mgImg = layer01.getElementsByTagName('img')[0];
    const bgImg = layer00.getElementsByTagName('img')[0];
    fgImg.src = `/layer_${currentSet || '00'}_02.png?` + new Date().getTime();
    mgImg.src = `/layer_${currentSet || '00'}_01.png?` + new Date().getTime();
    bgImg.src = `/layer_${currentSet || '00'}_00.png?` + new Date().getTime();
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
                transparentContainer.classList.remove('active');
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
        setTimeout(() => {
            imageContainer.innerHTML = ''; // Clear existing standard images
        }, 1000);
        const transparentContainer = slideshowFull.querySelector('.image-container');
        if (transparentContainer) {
            transparentContainer.classList.remove('active');
        }
    }
    if (!init) {
        document.querySelectorAll('.layer').forEach((e, i) => {
            setTimeout(() => {
                e.classList.add('active')
            }, 100 * i);
            init = true;
        })
    }
}

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
async function fetchNextImage() {
    const response = await fetch(`/next-image?width=${frameWidth}&height=${frameHeight}`);
    const data = await response.json();
    const img = await preloadImage(data);
    return { img, orientation: data.orientation, trans: data.hasTransparency };
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
function handleTransparentImage(img, orientation) {
    imageContainer.classList.remove('active');
    setTimeout(() => {
        imageContainer.innerHTML = ''; // Clear existing standard images
    }, 1000);

    setTimeout(() => {

        slideshowFull.innerHTML = ''; // Clear any previous transparent image

        const transparentContainer = document.createElement('div');
        transparentContainer.classList.add('image-container', 'active', orientation);
        transparentContainer.appendChild(img);

        slideshowFull.appendChild(transparentContainer);
    }, 250);
}
function handleStandardImage(img, orientation) {
    const images = imageContainer.querySelectorAll('img');
    if (images.length >= 3) {
        const oldestImage = images[0];
        oldestImage.classList.remove('active');
        setTimeout(() => oldestImage.remove(), 1000);
    }
    img.className = orientation;
    img.classList.add('active');
    imageContainer.appendChild(img);
    imageContainer.classList.add('active');
    const transparentContainer = slideshowFull.querySelector('.image-container');
    if (transparentContainer) {
        transparentContainer.classList.remove('active');
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
