/// <reference path="js/game-service.ts" />
module Betrayal {
    declare var io: SocketIOClientStatic;
    declare var angular: ng.IAngularStatic;

    var socket: SocketIOClient.Socket;

    // Socket.io
    socket = io('http://hidden-citadel-7739.herokuapp.com');
    console.log("id", socket);

    // Angular
    var betrayalApp = angular.module('betrayalApp', [
        'ngCookies',
        'ngRoute'
    ]);

    betrayalApp.config(['$routeProvider',
        function ($routeProvider : ng.route.IRouteProvider) {
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

    betrayalApp.factory('gameService', ['$cookieStore', function ($cookieStore: ng.cookies.ICookieStoreService) {
        var gameService = new Betrayal.GameService(socket, $cookieStore);

        socket.emit('join', function (data : Betrayal.Server.IJoinResponseData) {
            // Join the game, get our player id back
            console.log("joined", data);
            gameService.playerId = data.player.id;
            gameService.loadGame(data.game);
            // gameService.loadPlayer(data.player);
        });

        socket.on('game', function (gameData : Betrayal.Server.IGame) {
            console.log("gameData received");
            gameService.loadGame(gameData);
        });

        return gameService;
    }]);

    betrayalApp.controller('JoinCtrl', ['$scope', 'gameService', function ($scope, gameService: GameService) {
        $scope.playerName = gameService.name;

        $scope.joinGame = function () {
            if ($scope.playerName.length >= 2) {
                gameService.setName($scope.playerName);
                location.hash = "#/lobby";
            }
        };
    }]);

    betrayalApp.controller('LobbyCtrl', ['$scope', 'gameService', function ($scope, gameService: GameService) {
        $scope.getPlayers = function () {
            return gameService.game.players;
        };

        $scope.startGame = function () {
            gameService.startGame();
        };

        gameService.setStartGameCallback(function () {
            location.hash = "#/playing";
        });
    }]);

    betrayalApp.controller('PlayingCtrl', ['$scope', 'gameService', function ($scope, gameService: GameService) {
    }]);
}