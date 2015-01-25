var _ = require('underscore'),
  fs = require('fs');
var EventEmitter = require('events').EventEmitter;

exports.eventEmitter = new EventEmitter();


var games=[];
var players = [];
var timeouts = [];
var playerToGame = {};

// Betrayal Settings
var maxPlayers = 12;
var roundTimeLimit = 20;

var deckActions = {
    "ROBOT": "KILL A HUMAN",
    "ROBO-MINION": "ASSOCIATE WITH ANOTHER ACTIVATED ROBOT",
    "ROBO-RPG":"BLOW UP YOURSELF AND PLAYER, SUCCEED IF IT'S A HUMAN",
    "CHILD": "HUG A LIVE HUMAN",
    "REBEL": "KILL A PLAYER AND STAY ALIVE",
    "SNAKE": "DIE, THEN KILL THE PLAYER WHO KILLED YOU",
    "TWIN":"FIND YOUR TWIN (THEY CAN ALSO FIND YOU)",
    "MECHANIC":"DISABLE A LIVE ROBOT",
    "GUARDIAN":"PROTECT SOMEONE BEFORE THEY ARE ELIMINATED"
};

var robots = [
    "ROBOT",
    "ROBO-MINION",
    "ROBO-RPG",
];

var humans = [
    "CHILD",
    "REBEL",
    "SNAKE",
    "TWIN",
    "MECHANIC",
    "GUARDIAN"
];

var newDeck = function(possibles){
    // Make a deck of possible roles

    //TODO: For each class in the possible array, add the correct number of cards

    deck = [
        'ROBOT', 'ROBO-MINION', 'ROBO-RPG', 'CHILD', 'REBEL', 'SNAKE', 'TWIN', 'TWIN', 'MECHANIC', 'GUARDIAN'
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
        success:false,
        deckActions:deckActions
    };
    games.push(game);
    return game;
};

var newRound = function(game){
    console.log("newRound");
    // Give everyone a role
    var deck = newDeck();
    for(var p in game.players){
        var player = game.players[p];
        player.role = deck.pop();
        player.target = null;
        if(player.state == 'dead') player.state = 'active';
        player.success = false;
    }
    
    //TODO: Start the timer ticking
    var now = new Date().getTime(); // Milliseconds
    game.now = now;
    var roundEnd = now + roundTimeLimit * 1000;
    game.roundEnd = roundEnd;

    timeouts[game.id] = setTimeout(function(){exports.endRound(game.id, function(err, data){console.log("ended"); exports.eventEmitter.emit('timeout', data.game);});}, roundTimeLimit * 1000);

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
    var game = _.find(games, function(game){ return game.state == "prep";});
    if(typeof game == "undefined") {
        game = newGame();
        // games.push(game);
    }
    game.now = new Date().getTime();
    var player = _.findWhere( game.players, {id: uuid} );
    if( typeof player === 'undefined'){
        player = {
            id: uuid,
            name: names.shift() || uuid,
            role: "",
            state: 'active',
            score: 0
        };
        playerToGame[player.id] = game.id;
    }
    if(_.where(game.players, {state:'active'}).length >= maxPlayers) player.state = 'spectating';

    players.push(player); // All players
    game.players.push(player); // Players for the game
    
    cb(null, {game:game});
};

exports.start = function(gameId, cb){
    console.log("gameController.start");
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

    // End of round class restrictions
    for(var p in game.players){
        var player = game.players[p];
        if(player.role == 'MECHANIC' && player.state == 'active' && player.target){
            targetPlayer = _.findWhere(game.players, {id:player.target});
            // targetPlayer.score++;
        }
        // REBEL must be alive to get points
        if(player.role == 'REBEL' && player.state == 'dead') player.success = false;


        // Finally, give them points if success
        if(player.success) player.score++;
    }
    
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

exports.getGame = function(){ return game; };

exports.getScores = function(){
    return _.map(game.players, function(val, key){ return { id:val.id, name:val.name, score:val.score }; });
};

exports.getPlayers = function(){ return players; };

exports.getPlayer = function(uuid){ return _.find(players, function(player){ return player.id == uuid; } );};

exports.getState = function(){ return game.state; };

exports.getTitle = function(){ return game.title; };

exports.getRound = function(){ return game.round; };

exports.getWinner = function(){ return game.winner; };

exports.setName = function(playerId, name, cb){
    var gameId = playerToGame[playerId];
    var game = games[gameId];
    if( !game ) return cb("game not found");
    var p = _.find(game.players, function(player){ return player.id == playerId; });
    if(p) p.name = name;

    cb(null, { game:game });
};

exports.playRole = function(playerId, target, cb){
    // Play a role to the group
    var gameId = playerToGame[playerId];
    var game = games[gameId];
    if(!game) return cb("game not found", null);
    game.now = new Date().getTime();

    if(game.state != 'active') cb("Game has not started");

    var player = _.findWhere( game.players, {id: playerId} ); // game.players[id];
    var targetPlayer = _.findWhere( game.players, {id: target} );
    var guardianPlayer = _.findWhere(game.players, {role: "GUARDIAN"});
    
    if(player.state != "active") return cb("You cannot play an action now.");
    if(player.target !== null) return cb("You have already played your action");
    if(!targetPlayer) return cb("You must choose a target");

    roleMessages = [];
    switch(player.role){
        // "ROBOT": "KILL A HUMAN",
        // "ROBO-MINION": "ASSOCIATE WITH ANOTHER ACTIVATED ROBOT",
        // "ROBO-RPG":"BLOW UP NON-ROBOT PLAYER",
        // "CHILD": "HUG A LIVE HUMAN",
        // "REBEL": "KILL A PLAYER AND STAY ALIVE",
        // "SNAKE": "DIE, THEN KILL THE PLAYER WHO KILLED YOU",
        // "TWIN":"FIND YOUR TWIN (THEY CAN ALSO FIND YOU)",
        // "MECHANIC":"DISABLE A LIVE ROBOT",
        // "GUARDIAN":"PROTECT SOMEONE BEFORE THEY ARE ELIMINATED"
        case "ROBOT":
            // If it's a human, kill them
            player.target = target;
            if(humans.indexOf(targetPlayer.role) != -1 && targetPlayer.state == 'active') {
                // Failure
                roleMessages.push({"role":player.role, "message":"You failed to kill " + targetPlayer.name + "(" + targetPlayer.state + ")"});
                break;
            }
            if( guardianPlayer && guardianPlayer.target == target){
                guardianSave(player, targetPlayer, guardianPlayer);
                break;
            }
            player.success = true;
            targetPlayer.state = 'dead';
            roleMessages.push({"role":player.role, "message":"You killed " + targetPlayer.name});
            roleMessages.push({"role":targetPlayer.role, "message":"A ROBOT killed you "});
            // Subtract 15 seconds from the timer?
            break;
        case "ROBO-MINION":
            if(robots.indexOf(targetPlayer.role) != -1 && targetPlayer.state == 'active'){
                player.success = true;
                roleMessages.push({"role":player.role, "message":"You found the " + targetPlayer.role + "!"});
            } else {
                roleMessages.push({"role":player.role, "message":"You failed, " + targetPlayer.name + " is not a robot."});
            }
            break;
        case "ROBO-RPG":
            player.target = target;
            if(humans.indexOf(targetPlayer.role) != -1 && targetPlayer.state == 'active'){
                player.success = true;
                roleMessages.push({"role":player.role, "message":"You killed the human " + targetPlayer.role + "!"});
            } else {
                roleMessages.push({"role":player.role, "message":"You failed and killed the robot " + targetPlayer.role + "!"});
            }
            roleMessages.push({role:targetPlayer.role, message:"You have died from a " + player.role});
            player.state = 'dead';
            targetPlayer.state = 'dead';
            break;
        case "CHILD":
            player.target = target;
            if(humans.indexOf(targetPlayer.role) != -1 && targetPlayer.state == 'active')
                player.success = true;
            roleMessages.push({role: player.role, message:"YOU HUGGED A " + targetPlayer.role});
            break;
        case "REBEL":
            if( targetPlayer.state != "active") return cb("You cannot attack this player");
            player.target = target;
            if( guardianPlayer && guardianPlayer.target == target){
                guardianSave(player, targetPlayer, guardianPlayer);
                break;
            }
            player.success = true;
            targetPlayer.state = "dead";
            roleMessages.push({ role:player.role, message:"You killed " + targetPlayer.name});
            roleMessages.push({ role:targetPlayer.role, message:"You got killed by the rebel!"});
            break;
        case "SNAKE":
            if(player.state != 'dead') return cb ("You are not dead.");
            player.target = target;
            if( guardianPlayer && guardianPlayer.target == target){
                guardianSave(player, targetPlayer, guardianPlayer);
                roleMessages.push({role: player.role, message: "Your bite was foiled by the GUARDIAN! "});
                roleMessages.push({role: targetPlayer.role, message: "The GUARDIAN saved you!"});
            } else if (targetPlayer.target == player.id && targetPlayer.state == 'active') {
                player.success = true;
                targetPlayer.state = "dead";
                targetPlayer.role = targetPlayer.role;
                roleMessages.push({role: player.role, message: "You bit the " + targetPlayer.role});
                roleMessages.push({role: targetPlayer.role, message: "You got bit by the snake!"});
            } else {
                // Fail state
                roleMessages.push({role: player.role, message: "You failed to bite " + targetPlayer.role + "(" + targetPlayer.state + ")"});
            }
            break;
        case "TWIN":
            player.target = target;
            if(targetPlayer.role == "TWIN"){
                roleMessages.push({role:player.role, message: player.name + "has found their twin!"});
                player.success = true;
                targetPlayer.success = true;
            }
            else
                roleMessages.push({role: player.role , message: player.role + " did not find their twin"});
            break;
        case "MECHANIC":
            player.target = target;
            if(robots.indexOf(targetPlayer.role) != -1 && targetPlayer.status == 'active'){
                player.success = true;
                target.success = true;
                roleMessages.push({role: player.role, message: "You found and saved the " + targetPlayer.role});
                roleMessages.push({role: targetPlayer.role, message: "You have been saved by the " + player.role + "!"});
            }
            break;
        case "GUARDIAN":
            if(targetPlayer.state != "active") return cb("You cannot protect them");
            player.target = target;
            roleMessages.push({role: player.role, message: "You protected " + targetPlayer.name});
            break;
        default:
            return cb("You broke the game.");
    }
        

    // Do the role


    cb(null, {game:game, role:roleMessages});
};

var guardianSave = function(player, targetPlayer, guardianPlayer){
    // Reverse them
    guardianPlayer.success = true;
    guardianPlayer.target = -1; // The only can help once
    roleMessages.push({role: player.role, message: "You tried to kill the " + targetPlayer.role + " who was protected by the GUARDIAN"});
    roleMessages.push({role: guardian.role, message: "You protected the " + targetPlayer.role + " who was going to be killed by the " + player.role + "!"});
};

exports.reset = function(cb){
    init();
    cb(null, game);
};

init();
