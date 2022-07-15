db.createUser({
    user: 'root',
    pwd: 'changethis',
    roles: [
        {
            role: 'readWrite',
            db: 'banlistdb',
        },
    ],
});

db = new Mongo().getDB("banlistdb");

db.createCollection('ipbans', { capped: false });

db.ipbans.insert([
    { "ip": "127.0.0.1" }
]);