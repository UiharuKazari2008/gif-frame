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
function preloadImage(url, minPadding = 20, imgWidth = 320, imgHeight = 320) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = url;

        img.onload = () => {
            if (!transparent) {
                // Get the dimensions and styles of the slideshow element
                const slideshow = document.getElementById('slideshow');
                const computedStyle = window.getComputedStyle(slideshow);

                const paddingLeft = parseFloat(computedStyle.paddingLeft);
                const paddingRight = parseFloat(computedStyle.paddingRight);
                const paddingTop = parseFloat(computedStyle.paddingTop);
                const paddingBottom = parseFloat(computedStyle.paddingBottom);

                const availableWidth = slideshow.offsetWidth - paddingLeft - paddingRight;
                const availableHeight = slideshow.offsetHeight - paddingTop - paddingBottom;

                // Ensure minimum size for the image
                const imgActualWidth = Math.max(imgWidth, 320);
                const imgActualHeight = Math.max(imgHeight, 320);

                const rotation = Math.random() * 40 - 20; // Random rotation between -20 and 20 degrees
                const radRotation = (Math.PI / 180) * Math.abs(rotation);

                // Calculate the rotated bounding box dimensions
                const rotatedWidth = Math.abs(Math.cos(radRotation) * imgActualWidth + Math.sin(radRotation) * imgActualHeight);
                const rotatedHeight = Math.abs(Math.sin(radRotation) * imgActualWidth + Math.cos(radRotation) * imgActualHeight);

                // Generate random position ensuring rotated image stays within bounds
                const horizontalPos = Math.random() * (availableWidth - rotatedWidth - 2 * minPadding);
                const verticalPos = Math.random() * (availableHeight - rotatedHeight - 2 * minPadding);

                // Ensure position does not go outside the visible area
                const isLeft = horizontalPos + rotatedWidth / 2 < availableWidth / 2;
                const isTop = verticalPos + rotatedHeight / 2 < availableHeight / 2;

                // Adjust positions to remain within bounds
                const adjustedHorizontalPos = isLeft
                    ? horizontalPos + paddingLeft + minPadding
                    : availableWidth - horizontalPos - rotatedWidth - paddingRight - minPadding;
                const adjustedVerticalPos = isTop
                    ? verticalPos + paddingTop + minPadding
                    : availableHeight - verticalPos - rotatedHeight - paddingBottom - minPadding;

                // Apply position and rotation styles
                img.style.position = "absolute";
                img.style[isLeft ? "left" : "right"] = `${adjustedHorizontalPos}px`;
                img.style[isTop ? "top" : "bottom"] = `${adjustedVerticalPos}px`;
                img.style.transform = `rotate(${rotation}deg)`;
                /*img.width = imgActualWidth;
                img.height = imgActualHeight;*/
            }
            resolve(img);
        };

        img.onerror = reject;
    });
}
async function fetchNextImage() {
    const response = await fetch('/next-image');
    const data = await response.json();
    const img = await preloadImage(data.imageUrl, data.hasTransparency, undefined, data.width, data.height);
    return { img, orientation: data.orientation, trans: data.hasTransparency };
}
let imageTimer;
async function showNextImage() {
    if (activeSlideshow && enableSlideshow && !pauseSlideshow) {
        const { img, orientation, trans } = await fetchNextImage();

        if (trans) {
            const slideshow = document.getElementById('slideshow');
            const imageContainer = slideshow.querySelector('.image-container');
            imageContainer.classList.remove('active');

            setTimeout(() => {
                imageContainer.innerHTML = '';
                const slideshowFull = document.getElementById('slideshow-full');
                slideshowFull.innerHTML = ''; // Clear existing content
                const transparentContainer = document.createElement('div');
                transparentContainer.classList.add('image-container', orientation);
                transparentContainer.style.opacity = 1;
                transparentContainer.appendChild(img);
                slideshowFull.appendChild(transparentContainer);
            }, 250);
        } else {
            const slideshow = document.getElementById('slideshow');
            const imageContainer = slideshow.querySelector('.image-container');

            if (!imageContainer) {
                console.error('No image-container found. Ensure the DOM has an element with the class image-container.');
                return;
            }

            const images = imageContainer.querySelectorAll('img');
            if (images.length >= 3) {
                const oldestImage = images[0];
                oldestImage.style.opacity = 0;
                setTimeout(() => {
                    oldestImage.remove();
                }, 1000);
            }

            img.className = orientation;
            img.style.opacity = 1;
            imageContainer.appendChild(img);
            imageContainer.classList.add('active');
            const slideshowFull = document.getElementById('slideshow-full').querySelector('.image-container');
            if (slideshowFull)
                slideshowFull.style.opacity = 0;
        }

        clearTimeout(imageTimer);
        imageTimer = setTimeout(showNextImage, 60000);
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
