/// <reference path="js/game-service.ts" />
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
        var gameService = new Betrayal.GameService(socket);

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