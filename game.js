var _ = require('underscore')
  , fs = require('fs')
var EventEmitter = require('events').EventEmitter;

exports.eventEmitter = new EventEmitter();


var games=[];
var players = [];
var timeouts = [];
var playerToGame = {};

// Betrayal Settings
var maxPlayers = 12;
var roundTimeLimit = 10;
var startLives = 5;

var deckActions = {
    "ROBOT": "SUBTRACT 15 SECONDS FROM THE TIMER",
    "LIEBOT": "SEND A LIE TO A PLAYER",
    "SYMPATHIZER":"BLOW UP NON-ROBOT PLAYER",
    "CHILD": "HUG A PLAYER TO CHECK FOR SQUISHY INSIDES",
    "REBEL": "KILL SOMEONE AND GET AWAY WITH IT",
    "SNAKE": "BITE A HUMAN WHO INTERACTED WITH YOU",
    "TWIN":"FIND YOUR TWIN",
    "MECHANIC":"DISABLE A ROBOT",
    "GUARDIAN":"PROTECT SOMEONE ABOUT TO BE MURDERED"
};

var newDeck = function(possibles){
    // Make a deck of possible roles

    //TODO: For each class in the possible array, add the correct number of cards

    deck = [
        'ROBOT', 'SYMPATHIZER', 'CHILD', 'REBEL', 'SNAKE', 'TWIN', 'TWIN', 'MECHANIC'
    ];
    //TODO: Cut it to players + 1

    return _.shuffle(deck);
};

var init = function(cb){
    fs.readFile('names.txt', function(err, data) {
        if(err) throw err;
        names = data.toString().split("\n");
    });
};

var newGame = function(cb){
    var game = {
        id:games.length,
        now:new Date().getTime(),
        timer:roundTimeLimit,
        players:[],
        state:"prep",
        deckActions:deckActions
    };
    games.push(game);
    return game;
};

var newRound = function(game){
    // Give everyone a role
    var deck = newDeck();
    for(var p in game.players){
        var player = game.players[p];
        player.role = deck.pop();
    }
    
    //TODO: Start the timer ticking
    var now = new Date().getTime(); // Milliseconds
    game.now = now;
    var roundEnd = now + roundTimeLimit * 1000;
    game.roundEnd = roundEnd;

    timeouts[game.id] = setTimeout(function(){exports.endRound(game.id, function(err, data){console.log("ended"); exports.eventEmitter.emit('timeout', data.game)});}, roundTimeLimit * 1000);

};

exports.playerToGame = function(playerId, cb){
    console.log("playerToGame", playerId, playerToGame[playerId]);
    return playerToGame[playerId];
};

exports.join = function(uuid, cb){
    if(uuid === undefined) {
        cb("UUID not found");
        return;
    }
    var game = _.find(games, function(game){ return game.state == "prep" });
    if(typeof game == "undefined") {
        game = newGame();
        // games.push(game);
    }
    game.now = new Date().getTime()
    var player = _.findWhere( game.players, {id: uuid} )
    if( typeof player === 'undefined'){
        var player = {
            id: uuid
            , name: names.shift() || uuid
            , role: ""
            , lives: startLives
            , state: 'active'
            , score: 0
        }
        playerToGame[player.id] = game.id;
    }
    if(_.where(game.players, {state:'active'}).length >= maxPlayers) player.state = 'spectating';

    players.push(player); // All players
    game.players.push(player); // Players for the game
    
    cb(null, {game:game});
};

exports.start = function(gameId, cb){
    var game = games[gameId];
    
    if(!game) return cb("game not found", null);
    game.now = new Date().getTime();
    // var activePlayers = _.find(game.players, function(player){(player.state=="active")});
    // if(!activePlayers || activePlayers.length < 2) return cb("Not enough players to start", null);
    if(game.players.length < 2) return cb("Not enough players to start", null);
    
    game.state = 'active';
    newRound(game);
    cb(null, {game:game});
};

exports.endRound = function(gameId, cb){
    console.log("End Round");
    if(timeouts[gameId]) {
        clearTimeout(timeouts[gameId]); // Just in case
        timeouts[gameId] = null;
    }
    var game = games[gameId];
    if(!game) return cb("game not found", null);
    game.now = new Date().getTime();
    
    game.state = 'ended';

    //TODO: Resolve the winner


    cb(null, {game:game});
};

exports.leave = function(gameId, uuid, cb){
    var game = games[gameId];
    if(!game) return;
    game.now = new Date().getTime();
    // Remove their player
    var player = _.findWith(game.players, {id:uuid});
    if(player){
        if(player.state != "spectating") player.state = "disconnect";
        // If only one active player left, end the round
        if(game.state == "active"){
            if(_.where(game.players, {state:'active'}).length <= 1)
                game.state = "ended";
        } else if(game.state == "prep") {
            // Remove players from games that haven't started
            game.players = _.without(game.players, player);
        }
        cb(null, {players: game.players, state: game.state});
    }
    // game.players = _.without(game.players, player)
};

exports.getGame = function(){ return game }

exports.getScores = function(){
    return _.map(game.players, function(val, key){ return { id:val.id, name:val.name, score:val.score }; })
}

exports.getPlayers = function(){ return players }

exports.getPlayer = function(uuid){ return _.find(players, function(player){ return player.id == uuid })}

exports.getState = function(){ return game.state }

exports.getTitle = function(){ return game.title }

exports.getRound = function(){ return game.round }

exports.getWinner = function(){ return game.winner }

exports.setName = function(id, name, cb){
    var p = _.find(game.players, function(player){ return player.id == id })
    if(p) p.name = name
    cb(null, { players: game.players })
}

exports.playRole = function(playerId, target, cb){
    // Play a role to the group
    var gameId = playerToGame[playerId];
    var game = games[gameId];
    if(!game) return cb("game not found", null);
    game.now = new Date().getTime();

    var player = _.findWhere( game.players, {id: playerId} ); // game.players[id];
    var targetPlayer = _.findWhere( game.players, {id: target} );
    var guardianPlayer = _.findWhere(game.players, {role: "GUARDIAN"});
    var guardianRole = guardianPlayer.role;

    if(player.state != "active") return cb("You cannot play an action now.");
    if(player.target != null) return cb("You have already played your action");
    
    // Get the player's role
    var playerRole = player.role;
    var targetRole = target.role;
    roleMessages = [];
    switch(playerRole){
        // 'ROBOT', 'SYMPATHIZER', 'CHILD', 'REBEL', 'SNAKE', 'TWIN', 'TWIN', 'MECHANIC'
        case "ROBOT":
            // Subtract 15 seconds from the timer?
            break;
        case "SYMPATHIZER":
            if(targetPlayer.role == "ROBOT") return cb("Cannot blow up the robot");
            player.state = 'dead';
            targetPlayer.state = 'dead';
            roleMessages.append({playerRole:"You blew up taking out yourself and the " + targetPlayer.role });
            break;
        case "CHILD":
            roleMessages.append({"CHILD":"YOU HUGGED A " + targetRole});
            break;
        case "REBEL":
            if( target.state != "active") return cb("You cannot attack this player");
            if( guardianPlayer.target == target){
                // Reverse them
                player.state = "dead";
                guardianPlayer.target = -1; // The only can help once
                roleMessages.append({ playerRole :"You died trying to kill " + target.name + " who was protected by the GUARDIAN"});
                roleMessages.append({ guardianRole :"You protected the " + target.name + " who was going to be killed by the " + player.role + "!"});
            }
            target.state = "dead";
            roleMessages.append({ playerRole :"You killed " + target.name});
            roleMessages.append({ targetRole :"You got killed by the rebel!"});
            break;
        case "SNAKE":
            if(target.target != player.id) return cb ("You cannot attack this player");
            if( guardianPlayer.target == target){
                // Reverse them
                player.state = "dead";
                guardianPlayer.target = -1; // The only can help once
                roleMessages.append({ playerRole :"You died trying to bite " + target.name + " who was protected by the GUARDIAN"});
                roleMessages.append({ guardianRole :"You protected the " + target.name + " who was going to be killed by the " + player.role + "!"});
            }
            target.state = "dead";
            targetRole = target.role;
            roleMessages.append({ playerRole : "You bit " + target.name});
            roleMessages.append({ targetRole :"You got bit by the snake!"});
            break;
        case "TWIN":
            if(target.role == "TWIN")
                roleMessages.append({playerRole : player.name + "has found their twin!"});
            else
                roleMessages.append({playerRole : player.name + " did not find their twin"});
            break;
        case "MECHANIC":
            roleMessages.append({ playerRole : "You have found the robot"});
            break;
        case "GUARDIAN":
            if(targetPlayer.state != "active") return cb("You cannot protect them");
            player.target = target;
            roleMessages.append({playerRole : "You protected " + target.name});
            break;
        default:
            return cb("You broke the game.");
            break;
    }
        

    // Do the role


    cb(null, {game:game, role:roleMessages});
}

exports.reset = function(cb){
    init()
    cb(null, game);
}

init()