# **RTMP twitch restreamer**

RTMP restreamer with a twitchbot.

Only one person at a time is allowed to connect to the RTMP stream.

## **Chatbot commands**

### **!hop**
Regular users can vote to hop the current streamer with the !hop command.

If enough percent of the twitch chat wants to hop the current streamer is kicked off.

### **!forcehop !ban**
Moderators can !forcehop the current streamer or !ban them.

### **!kickpercent**
Moderators can set the percentage of !hops from chatters needed to kick streamer with !kickpercent [0-100]

### **!disablevoting !enablevoting**
Moderators can !disablevoting and !enablevoting

---

## **Configuration**

Add you streamkey to /nginx/conf/nginx.conf.custom

Add chatbot credentials and info to .env

Change database credentials in docker-compose.yml and /database/init-mongo.js

On your host machine forward port 1935

---

## **Beuild & start the images**
Start with "docker-compose up"