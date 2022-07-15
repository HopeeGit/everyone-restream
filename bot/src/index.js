const tmi = require("tmi.js");
const axios = require("axios");
var express = require("express");

var app = express();

const client = new tmi.Client({
    options: { debug: true },
    connection: {
        secure: true,
        reconnect: true
    },
    identity: {
        username: process.env.TWITCH_USERNAME,
        password: process.env.TWITCH_OAUTH
    },
    channels: [process.env.TWITCH_CHANNEL]
});

const refreshInterval = 1000 * 60 * 1; // Chat message interval

var votingenabled = true;
var hopVotes = 0;
var hopPercentage = 0.3;
var voters = []
const resetVotes = () => {
    hopVotes = 0;
    voters = []
}

const forceHop = (user) => {
    resetVotes();

    axios
        .post("http://restreamer-backend:8081/forcehop", "user=" + user.username)
        .then(res => {
        })
        .catch(error => {
            console.error(error);
        });

    axios
        .get("http://nginx-rtmp-container:8080/control/drop/publisher?app=live")
        .then(res => {
        })
        .catch(error => {
            console.error(error);
        });
}

const banStreamer = (user) => {
    resetVotes();

    client.say(process.env.TWITCH_CHANNEL, user.username + " banned current streamer.");

    axios
        .post("http://restreamer-backend:8081/ban", "user=" + user.username)
        .then(res => {
        })
        .catch(error => {
            console.error(error);
        });

    axios
        .get("http://nginx-rtmp-container:8080/control/drop/publisher?app=live")
        .then(res => {
        })
        .catch(error => {
            console.error(error);
        });
}

const doChatHop = () => {
    resetVotes();
    axios
        .post("http://restreamer-backend:8081/forcehop", "user=" + "votePercentage")
        .then(res => {
        })
        .catch(error => {
            console.error(error);
        });

    axios
        .get("http://nginx-rtmp-container:8080/control/drop/publisher?app=live")
        .then(res => {
        })
        .catch(error => {
            console.error(error);
        });
}

const voteHop = async (user) => {
    var streamactive = await axios
        .get("http://restreamer-backend:8081/streamactive")
        .then(res => {
            return res.data;
        })
        .catch(error => {
            console.error(error);
        });


    if (!streamactive) {
        client.say(process.env.TWITCH_CHANNEL, "Nobody is currently streaming.");
        return;
    }

    if (voters.includes(user.username)) {
        return; // has already voted
    } else {
        voters.push(user.username);
        hopVotes++;
        checkVotePercentage();
    }

    axios
        .post("http://restreamer-backend:8081/hop", "user=" + user.username)
        .then(res => {
        })
        .catch(error => {
            console.error(error);
        });
}

const checkVotePercentage = async () => {
    var streamactive = await axios
        .get("http://restreamer-backend:8081/streamactive")
        .then(res => {
            return res.data;
        })
        .catch(error => {
            console.error(error);
        });


    if (!streamactive) {
        client.say(process.env.TWITCH_CHANNEL, "Nobody is streaming yet :(");
        return;
    }

    if (hopVotes >= Math.ceil((chatters.length + 1) * hopPercentage)) {
        client.say(process.env.TWITCH_CHANNEL, "Hop votes " + hopVotes + " out of " + Math.ceil((chatters.length + 1) * hopPercentage) + " needed. Hopping...");
        doChatHop();
        return;
    }
    console.log("Hop votes " + hopVotes + " out of " + Math.ceil((chatters.length + 1) * hopPercentage) + " needed.");
    client.say(process.env.TWITCH_CHANNEL, "Hop votes " + hopVotes + " out of " + Math.ceil((chatters.length + 1) * hopPercentage) + " needed.");
}

// Periodic chat messages & vote percentage check
var voteCheckIntervalObj = setInterval(() => {
    console.log("People in chat: " + chatters.length);
    console.log("Hop votes: " + hopVotes + " out of " + Math.ceil((chatters.length + 1) * hopPercentage) + " needed.");
    checkVotePercentage();
}, refreshInterval);

client.connect();

// Track people joining and leaving chat
var chatters = []
client.on("join", (channel, username, self) => {
    chatters.forEach((chatter) => {
        if (chatter === username) {
            return false;
        }
    })

    console.log(username + " has joined the chat.")
    chatters.push(username);
    return true;
});

client.on("part", (channel, username, self) => {
    const index = chatters.indexOf(username);
    if (index != -1) {
        chatters.splice(index, 1);
    }

    console.log(username + " has left the chat.")
});

// Handle chat messages
client.on("chat", function (channel, user, message, self) {
    if (self || !message.startsWith('!')) {
        return;
    }

    const args = message.slice(1).split(' ');
    const command = args.shift().toLowerCase();


    // Regular !hop from chat
    if (command === "hop") {
        if(votingenabled) {
            voteHop(user);
        }
        
    }


    // Mod commands
    if (user["user-type"] === "mod" || user.username === channel.replace("#", "")) {
        
        if (command === "ban") {
            banStreamer(user);
        }

        if (command === "forcehop") {
            forceHop(user);
        }

        if (command === "clearchat") {
            client.clear(channel);
        }

        if (command === "kickpercent") {
            try {
                if (!isNaN(parseFloat(args[0]))) {
                    hopPercentage = Number(args[0]) / 100;
                    console.log("Set kickpercent to " + hopPercentage);
                    checkVotePercentage()
                }

            } catch (err) {
                console.log(err);
            }
        }

        if (command === "enablevoting") {
            votingenabled = true;
            client.say(process.env.TWITCH_CHANNEL, "Voting with !hop enabled");
        }

        if (command === "disablevoting") {
            votingenabled = false;
            client.say(process.env.TWITCH_CHANNEL, "Voting with !hop disabled");
        }
        
    }
});



// Callback from backend to notify about new streamers
app.get("/streamerjoining", async (request, response) => {
    try {
        client.say(process.env.TWITCH_CHANNEL, "New streamer joining!");
        response.status(200);
        response.send("OK");
    } catch (error) {
        response.status(500).send(error);
    }
});

var server = app.listen(8081, function () {
    var host = server.address().address
    var port = server.address().port

    console.log("Chatbot listening at http://%s:%s", host, port)
})