module Betrayal {
    declare var io;
    declare var angular;

    class GameService {
        playerId: string;

        game: any;

        player: any;

        otherPlayers: Array<any>;

        constructor() {
            this.playerId = null;
        }

        loadGame (gameData: any) {
            this.game = gameData;
            console.log("Game is now", this.game);
            for (var x in this.game.players) {
                var p = this.game.players[x];
                if (p.id === this.playerId) {
                    this.player = p;
                    // Shift players at the current player
                    this.otherPlayers = this.game.players.slice(x + 1).concat(this.game.players.slice(0, x));
                    break;
                }
            }

            // this.$digest();
        }

        loadPlayer = function (playerData: any) {
            this.player = playerData;
            console.log("Player is now", this.player);
            //gameService.$digest();
        }
    
        // Used to iterate each life
        range = function (n) {
            return new Array(n);
        }

        startGame = function () {
            console.log("startGame");
            socket.emit('start', function (err, game) {
                console.log(err, game);

            });
        }

        endRound = function () {
            console.log("endRound");
            socket.emit('end', function (err, game) {
                console.log(err, game);

            });
        }

        playCard = function (i) {
            // Get the card
            var card = this.player.hand[i];
            console.log("Play card", i, card);
            socket.emit('playCard', { card: i }, function (err) {
                if (err) console.log(err);
            });

        }

        setName = function (name) {
            socket.emit('name', { "name": name });
        }
    }     

    // Socket.io
    var socket = io.connect();
    console.log("id", socket);

    // Angular
    var betrayalApp = angular.module('betrayalApp', [
        'ngRoute'
    ]);

    betrayalApp.config(['$routeProvider',
        function ($routeProvider) {
            $routeProvider.
                when('/lobby', {
                    templateUrl: 'partials/player-lobby.html',
                    controller: 'LobbyCtrl'
                }).
                when('/join', {
                    templateUrl: 'partials/player-join.html',
                    controller: 'JoinCtrl'
                }).
                when('/playing', {
                    templateUrl: 'partials/player-playing.html',
                    controller: 'PlayingCtrl'
                }).
                otherwise({
                    redirectTo: '/join'
                });
        }]);

    betrayalApp.factory('gameService', [function () {
        var gameService = new GameService();

        socket.emit('join', function (data) {
            // Join the game, get our player id back
            console.log("joined", data);
            gameService.playerId = data.player.id;
            gameService.loadGame(data.game);
            // gameService.loadPlayer(data.player);
        });

        socket.on('game', function (gameData) {
            console.log("gameData received");
            gameService.loadGame(gameData);
        });

        return gameService;
    }]);

    betrayalApp.controller('JoinCtrl', ['$scope', 'gameService', function ($scope, gameService: GameService) {
        $scope.join = function (user) {
            gameService.setName(user.name);
            location.hash = "#/lobby";
        };
    }]);

    betrayalApp.controller('LobbyCtrl', ['$scope', 'gameService', function ($scope, gameService: GameService) {
    }]);

    betrayalApp.controller('PlayingCtrl', ['$scope', 'gameService', function ($scope, gameService: GameService) {
    }]);
}