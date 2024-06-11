const express = require('express');
const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');

const app = express();
const port = 3000;

let images = [];

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/next-image', (req, res) => {
    if (images.length === 0) {
        images = fs.readdirSync(path.join(__dirname, 'public', 'images')).filter(file => file.endsWith('.gif'));
    }
    const nextImage = images.shift();
    images.push(nextImage);

    const imagePath = path.join(__dirname, 'public', 'images', nextImage);
    const dimensions = sizeOf(imagePath);
    const orientation = dimensions.width >= dimensions.height ? 'landscape' : 'portrait';

    res.json({ imageUrl: `/images/${nextImage}`, orientation });
});

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
