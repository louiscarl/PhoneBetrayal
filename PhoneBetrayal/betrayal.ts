module Betrayal {
    declare var io;
    declare var angular;

    // Socket.io
    var socket = io('http://hidden-citadel-7739.herokuapp.com').connect();
    console.log("id", socket);

    // Angular
    var betrayalApp = angular.module('betrayalApp', [
        'ngRoute'
    ]);

    betrayalApp.config(['$routeProvider',
        function ($routeProvider) {
            $routeProvider.
                when('/join', {
                templateUrl: 'partials/player-join.html',
                controller: 'GameCtrl'
            }).
                otherwise({
                redirectTo: '/join'
            });
        }]);

    betrayalApp.controller('GameCtrl', ['$scope', function($scope) {
            $scope.playerId = 0;

        $scope.loadGame = function (gameData) {
            $scope.game = gameData;
            console.log("Game is now", $scope.game);
            for (var x in $scope.game.players) {
                var p = $scope.game.players[x];
                if (p.id === $scope.playerId) {
                    $scope.player = p;
                    // Shift players at the current player
                    $scope.otherPlayers = $scope.game.players.slice(x + 1).concat($scope.game.players.slice(0, x));
                    break;
                }
            }
            $scope.$digest();
        };

        $scope.loadPlayer = function (playerData) {
            $scope.player = playerData;
            console.log("Player is now", $scope.player);
            $scope.$digest();
        };
    
        // Used to iterate each life
        $scope.range = function (n) {
            return new Array(n);
        };

        $scope.startGame = function () {
            console.log("startGame");
            socket.emit('start', function (err, game) {
                console.log(err, game);

            });
        };

        $scope.endRound = function () {
            console.log("endRound");
            socket.emit('end', function (err, game) {
                console.log(err, game);

            });
        };

        $scope.playCard = function (i) {
            // Get the card
            var card = $scope.player.hand[i];
            console.log("Play card", i, card);
            socket.emit('playCard', { card: i }, function (err) {
                if (err) console.log(err);
            });

        };

        $scope.setName = function (name) {
            socket.emit('name', { "name": name });
        };

        socket.emit('join', function (data) {
            // Join the game, get our player id back
            console.log("joined", data);
            $scope.playerId = data.player.id;
            $scope.loadGame(data.game);
            // $scope.loadPlayer(data.player);
        });

        socket.on('game', function (gameData) {
            console.log("gameData received");
            $scope.loadGame(gameData);
        });
    }]);
}