const express = require('express');
const fs = require('fs');
const path = require('path');
const sizeOf = require('image-size');
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const bodyParser = require('body-parser');
const config = require('./config.json');
let tokens = undefined;
let oAuth2Client = undefined;

const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'];
const TOKEN_PATH = './youtube-token.live.json';

const app = express();
const port = 5770;

let loginOk = false;
let liveState = false;
let activeLive;
let liveMessages = [];

let streamRefresh
let streamChat

let sentImages = [];
let globalActive = true;

app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'pug');

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/next-image', (req, res) => {
    const images = fs.readdirSync(path.join(__dirname, 'public', 'images')).filter(file => file.endsWith('.gif'));
    let availableImages = images.filter(image => !sentImages.includes(image));
    if (availableImages.length === 0) {
        sentImages = [];
        availableImages = images;
    }
    const nextImage = availableImages[Math.floor(Math.random() * availableImages.length)];
    const imagePath = path.join(__dirname, 'public', 'images', nextImage);
    const dimensions = sizeOf(imagePath);
    const orientation = dimensions.width >= dimensions.height ? 'landscape' : 'portrait';
    sentImages.push(nextImage);

    res.json({ imageUrl: `/images/${nextImage}`, orientation });
});

app.get('/active', (req, res) => {
    res.send(globalActive.toString())
})
app.get('/active/setting', (req, res) => {
    const getCurrentStatus = () => {
        if (config.nightMode) {
            const now = new Date();
            const currentHour = now.getHours();

            if (currentHour >= config.nightStart || currentHour < config.nightEnd) {
                return "night";
            }
        }
        return true;
    };

    res.send(globalActive ? getCurrentStatus().toString() : globalActive.toString());
})
app.get('/active/on', (req, res) => {
    globalActive = true;
    res.send(globalActive.toString())
})
app.get('/active/off', (req, res) => {
    globalActive = false;
    res.send(globalActive.toString())
})

// Generate a URL for authorization
app.get('/authorize', (req, res) => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
    });
    res.redirect(authUrl);
});
app.get('/oauth2callback', (req, res) => {
    const code = req.query.code;
    oAuth2Client.getToken(code, (err, token) => {
        if (err) return res.send('Error retrieving access token');
        oAuth2Client.setCredentials(token);
        loginOk = true;
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
            if (err) console.error(err);
            res.send('Authorization successful! You can close this tab.');
        });
    });
});

app.get('/url', async (req, res) => {
    await refreshLiveBroadcasts();
    if (!loginOk) {
        res.send("<b>Please Contact PlayLand Gau Staff to Authorise the Youtube account</b>");
    } else if (liveState) {
        res.redirect(`https://www.youtube.com/watch?v=${activeLive.id}`)
    } else {
        res.redirect("https://www.youtube.com/@RhythmGamer")
    }
})
app.get('/live', async (req, res) => {
    await refreshLiveBroadcasts();
    if (!loginOk) {
        res.json({err: "Login Required"});
    } else if (liveState) {
        res.json({live: activeLive});
    } else {
        res.json({live: false});
    }
})
app.get('/chat/html', async (req, res) => {
    res.render('chat', {enable: !!oAuth2Client, login: loginOk, live: (liveState ? activeLive : false), chat: liveMessages.filter(e => (new Date()) - (new Date(e.time)) <= 30 * 60 * 1000).slice(-4)});
})
app.get('/chat/json', async (req, res) => {
    res.json({live: activeLive, chat: liveMessages});
})

async function checkTokenValidity() {
    return new Promise(ok => {
        oAuth2Client.getAccessToken((err, token) => {
            if (err || !token) {
                if (err)
                    console.error(err)
                ok(false);
            } else {
                ok(true);
            }
        });
    })
}
async function refreshLiveBroadcasts() {
    if (!loginOk)
        return false;
    const service = google.youtube('v3');
    return new Promise((ok) => {
        service.liveBroadcasts.list({
            auth: oAuth2Client,
            part: ['snippet','contentDetails','status'],
            broadcastStatus: 'active',
            broadcastType: 'all',
            maxResults: 2
        }, (err, response) => {
            if (err) {
                if (err.message.includes("Login Required")) {
                    loginOk = false;
                }
                return console.error('The API returned an error: ' + err);
            }
            const broadcasts = response.data.items;
            if (broadcasts.length === 0) {
                ok(false);
                if (liveState) {
                    liveState = false;
                    liveMessages = [];
                    clearInterval(streamChat);
                    streamChat = null;
                    console.log(`Broadcast "https://www.youtube.com/watch?v=${activeLive.id}" has ended`);
                }
                activeLive = null;
            } else {
                broadcasts.sort((a, b) => new Date(b.snippet.scheduledStartTime) - new Date(a.snippet.scheduledStartTime));
                //`Title: ${broadcast.snippet.title}, URL: https://www.youtube.com/watch?v=${broadcast.id}`
                if (!liveState) {
                    activeLive = broadcasts[0];
                    liveMessages = [];
                    liveState = true;
                    clearInterval(streamChat);
                    streamChat = setInterval(getLiveChatMessages, 10000);
                    console.log(`Broadcast "https://www.youtube.com/watch?v=${activeLive.id}" has started`);
                } else if (activeLive.id !== broadcasts[0].id) {
                    activeLive = broadcasts[0];
                    console.log(`Broadcast "https://www.youtube.com/watch?v=${activeLive.id}" has started (Replacement)`);
                }
                ok(true);
            }
        });
    })
}
function getLiveChatMessages() {
    if (loginOk && liveState && activeLive && activeLive.snippet) {
        const service = google.youtube('v3');
        service.liveChatMessages.list({
            auth: oAuth2Client,
            liveChatId: activeLive.snippet.liveChatId,
            part: 'snippet,authorDetails',
        }, (err, response) => {
            if (err) return console.error('The API returned an error: ' + err);
            const messages = response.data.items;
            liveMessages = messages.filter(m => m.snippet.hasDisplayContent && m.snippet.displayMessage.length > 0).map(msg => {
                return {
                    name: msg.authorDetails.displayName,
                    icon: msg.authorDetails.profileImageUrl,
                    text: msg.snippet.displayMessage,
                    time: msg.snippet.publishedAt
                }
            });
        });
    }
}

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
    if (fs.existsSync('./youtube-token.json')) {
        console.log("YouTube Watcher Active");
        tokens = JSON.parse(fs.readFileSync('./youtube-token.json').toString());
        oAuth2Client = new OAuth2(
            tokens.web.client_id, // Replace with your client ID
            tokens.web.client_secret, // Replace with your client secret
            'http://localhost:5770/oauth2callback'
        );
        fs.readFile(TOKEN_PATH, async (err, token) => {
            if (err) {
                console.log('Visit http://localhost:5770/authorize to start the authentication process.');
                loginOk = false;
            } else {
                oAuth2Client.setCredentials(JSON.parse(token.toString()));
                if (await checkTokenValidity()) {
                    loginOk = true;
                    console.log('Using existing authentication tokens.');
                    refreshLiveBroadcasts();
                } else {
                    console.log('Visit http://localhost:5770/authorize to start the authentication process.');
                    loginOk = false;
                }
            }
        })
        streamRefresh = setInterval(refreshLiveBroadcasts, 60000);
    }
});
