window.onload = function() {
    setInterval(refreshStickers, 300000); // 5 minutes in milliseconds
    setInterval(function () {
        getGlobalState();
        getChatMessages();
    }, 3000)
}

let currentImage = null;
let enableSlideshow = true;
let activeSlideshow = true;
let currentSet = 'true';

function refreshStickers() {
    const fgDiv = document.getElementById('backbaord-fg');
    const bgDiv = document.getElementById('backbaord-bg');
    const fgImg = fgDiv.getElementsByTagName('img')[0];
    const bgImg = bgDiv.getElementsByTagName('img')[0];
    fgImg.src = `/foreground${currentSet !== 'true' ? '-' + currentSet : ''}.png?` + new Date().getTime(); // Add timestamp to avoid caching
    bgImg.src = `/background${currentSet !== 'true' ? '-' + currentSet : ''}.png?` + new Date().getTime(); // Add timestamp to avoid caching
}
function preloadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = reject;
    });
}
async function fetchNextImage() {
    const response = await fetch('/next-image');
    const data = await response.json();
    const img = await preloadImage(data.imageUrl);
    return { img, orientation: data.orientation };
}
async function showNextImage() {
    if (activeSlideshow && enableSlideshow) {
        const {img, orientation} = await fetchNextImage();

        const newImageContainer = document.createElement('div');
        newImageContainer.classList.add('image-container', orientation);
        newImageContainer.appendChild(img);

        const slideshow = document.getElementById('slideshow');
        slideshow.appendChild(newImageContainer);

        setTimeout(() => {
            if (currentImage) {
                currentImage.classList.remove('active');
                setTimeout(() => {
                    currentImage.remove();
                    newImageContainer.classList.add('active');
                    currentImage = newImageContainer;
                }, 1000); // Ensure this matches the CSS transition duration
            } else {
                newImageContainer.classList.add('active');
                currentImage = newImageContainer;
            }
        }, 100);
        setTimeout(showNextImage, 60000);
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
            currentImage.classList.remove('active');
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
        currentImage.classList.remove('active');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    showNextImage();
});
