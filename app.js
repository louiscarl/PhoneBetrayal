var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var gameController = require('./game.js');

app.engine('jade', require('jade').__express);

var port = process.env.PORT || 3000;
server.listen(port);

app.use(express.static(__dirname + '/public'));


app.get('/', function(req, res) {
  res.render('index.jade', { title: 'Betrayal' });
});

// Socket variables
var availableUUID = 1;
var socketToUUID = [];

io.on('connection', function (socket) {
    // No persistence
    console.log("connection", socket.id);

    socket.on('connect', function(cb){
        // This is automatic when a socket connects
        // We don't use this because the client might not be ready to accept data
    });

    // User Joins
    socket.on('join', function(user, cb){
        var uuid = (user && user.uuid) ? user.uuid : socket.id;
        socketToUUID[socket.id] = uuid;
        // This is called manually when the client has loaded
        gameController.join(uuid, function(err, data){
            res = data.game;
            if (err) { socket.emit("alert", err); }
            else{
                socket.join(res.id);
                if(user && user.name) {
                    gameController.setName(uuid, user.name, function(err, data){
                        io.to(res.id).emit('game', data.game );
                    });
                } else {
                    io.to(res.id).emit('game', res );
                }
                
            }
            
            cb({game: res, player: gameController.getPlayer(uuid) });
        });
    });

    // Player calls to start the game
    socket.on('start', function(cb){
        var uuid = socketToUUID[socket.id];
        var gameId = gameController.playerToGame(uuid);
        gameController.start(gameId, function(err, data){
            if(!err) {
                game = data.game;
                io.to(gameId).emit('game', game);
            }
            return cb(err, null);
        });

    });

    socket.on('end', function(cb){
        var uuid = socketToUUID[socket.id];
        var gameId = gameController.playerToGame(uuid);
        gameController.endRound(gameId, function(err, data){
            game = data.game;
            if(!err) {
                io.to(gameId).emit('game', game);
            }
            return cb(err, game);
        });
    });

    // User Leaves
    socket.on('disconnect', function(){
        var uuid = socketToUUID[socket.id];
        var gameId = gameController.playerToGame(uuid);
        gameController.leave(uuid, function(){

        });
        console.log("Player left", uuid);
    });

    // User chooses a name
    socket.on('name', function(data, cb){
        var uuid = socketToUUID[socket.id];
        gameController.setName(uuid, data.name, function(err, data){
            console.log("returned");
            if(data.game) io.to(data.game.id).emit('game', data.game);
        });
    });

    // User plays their role action
    socket.on('playRole', function(data, cb){
        var uuid = socketToUUID[socket.id];
        gameController.playRole(uuid, data.target, function(err, data){
            if(err) return cb(err);
            if(data.game) io.to(data.game.id).emit('game', data.game);
            if(data.role){
                for (var x in data.role){
                    roleMessage = data.role[x];
                    console.log(roleMessage);
                    // roleMessage = data.role[x];
                    io.to(game.id).emit('role', roleMessage);
                }
            }
            cb(err);
        });
    });

});


gameController.eventEmitter.on('timeout', function(game){
    io.to(game.id).emit('game', game);
});