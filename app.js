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
        gameController.join(socket.id, function(err, res){
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
        gameController.start(gameId, function(err, game){
            if(!err) {
                console.log("Starting game", gameId);
                io.to(gameId).emit('game', game);
            }
            return cb(err, game);
        });

    });

    socket.on('end', function(cb){
        var gameId = gameController.playerToGame(socket.id);
        gameController.end(gameId, function(err, game){
            if(!err) {
                console.log("Ending game", gameId);
                io.to(gameId).emit('game', game);
            }
            return cb(err, game);
        });
    })

    // User Leaves
    socket.on('disconnect', function(){
        var gameId = gameController.playerToGame(socket.id);
        gameController.leave(socket.id, function(){

        });
        console.log("Player left", socket.id);
    });

    // User chooses a name
    socket.on('name', function(data, cb){
        gameController.setName(socket.id, data.name, cb)
    });

    // User plays their role action
    socket.on('playRole', function(data, cb){

    })

    // User plays a card
    socket.on('playCard', function(data, cb){
        console.log("playCard");
        gameController.playCard(socket.id, data.card, function(err, game){
            if(!err) io.to(game.id).emit('game', game);
            cb(err);
        });
    });

});