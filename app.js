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

io.on('connection', function (socket) {
    // No persistence
    uuid = socket.id;
    console.log("connection", socket.id);

    //socket.set('uuid', uuid);
    socket.on('connect', function(cb){
        // This is automatic when a socket connects
        // We don't use this because the client might not be ready to accept data
    });

    // User Joins
    socket.on('join', function(cb){
        // This is called manually when the client has loaded
        console.log("Player joined");
        gameController.join(socket.id, function(err, data){
            res = data.game
            if (err) { socket.emit("alert", err); }
            else{
                socket.join(res.id);
                console.log("emitting to", res.id);
                io.to(res.id).emit('game', res );
            }
          cb({game: res, player: gameController.getPlayer(uuid) });

        });
    });

    // Player calls to start the game
    socket.on('start', function(cb){
        var gameId = gameController.playerToGame(socket.id);
        gameController.start(gameId, function(err, data){
            game = data.game;
            if(!err) {
                console.log("Starting game", gameId);
                io.to(gameId).emit('game', game);
            }
            return cb(err, game);
        });

    });

    socket.on('end', function(cb){
        var gameId = gameController.playerToGame(socket.id);
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
        var gameId = gameController.playerToGame(socket.id);
        gameController.leave(socket.id, function(){

        });
        console.log("Player left", socket.id);
    });

    // User chooses a name
    socket.on('name', function(data, cb){
        gameController.setName(socket.id, data.name, function(err, data){
            console.log("returned");
            if(data.game) io.to(data.game.id).emit('game', data.game);
        });
    });

    // User plays their role action
    socket.on('playRole', function(data, cb){
        gameController.playRole(socket.id, data.target, function(err, data){
            if(err) return cb(err);
            if(data.game) io.to(data.game.id).emit('game', data.game);
            if(data.role){
                for (var roleMessage in data.role){
                    // roleMessage = data.role[x];
                    io.to(game.id).emit('role', roleMessage);
                }
            }
            cb(err);
        });
    });

});


gameController.eventEmitter.on('timeout', function(game){
    console.log("EventEmitter");
    io.to(game.id).emit('game', game);
});