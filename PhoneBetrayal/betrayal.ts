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

        socket.on('game', function (gameData : Betrayal.Server.IGame) {
            console.log("gameData received");
            gameService.loadGame(gameData);
        });

        socket.on('role', function (data: Betrayal.Server.IMessageData) {
            gameService.onMessage(data);
        })

        return gameService;
    }]);

    betrayalApp.controller('JoinCtrl', ['$scope', 'gameService', function ($scope, gameService: GameService) {
        $scope.joinAttempted = false;

        $scope.playerName = gameService.name;

        $scope.isDisabled = false;

        $scope.joinGame = function () {
            if (!$scope.joinAttempted && ($scope.playerName.length >= 2)) {
                $scope.joinAttempted = true;
                $scope.isDisabled = true;
                gameService.setName($scope.playerName);
                gameService.joinGame();
            }
        };

        gameService.setGameChangedCallback(function () {
            if ($scope.joinAttempted) {
                $scope.joinAttempted = false;
                gameService.setGameChangedCallback(null);
                location.hash = "#/lobby";
            }
        });
    }]);

    betrayalApp.controller('LobbyCtrl', ['$scope', 'gameService', function ($scope, gameService: GameService) {
        $scope.players = gameService.game.players;

        $scope.isDisabled = $scope.players.length < 2;

        $scope.startGame = function () {
            gameService.startGame();
        };

        gameService.setGameChangedCallback(function () {
            if (gameService.hasStarted) {
                gameService.setGameChangedCallback(null);
                location.hash = "#/playing";
            } else {
                $scope.players = gameService.game.players;
                $scope.isDisabled = $scope.players.length < 2;
                $scope.$digest();
            }
        });
    }]);

    betrayalApp.controller('PlayingCtrl', ['$scope', 'gameService', function ($scope, gameService: GameService) {

        var updateProperties = function () {
            $scope.role = gameService.player.role;
            $scope.name = gameService.name;
            $scope.action = gameService.game.deckActions[gameService.player.role];
            $scope.targetWhenDead = gameService.targetWhenDead();
            $scope.canAct = gameService.canAct;
            $scope.isActionDisabled = $scope.requiresTarget || !$scope.canAct;
            $scope.isAlive = gameService.player.state === 'active';
            var isTargetDisabled = !$scope.canAct || ($scope.targetWhenDead === $scope.isAlive);
            var otherPlayers = [];
            for (var i in gameService.otherPlayers) {
                var player = gameService.otherPlayers[i];
                otherPlayers.push({ id: player.id, name: player.name, isTargetDisabled: (isTargetDisabled || player.state !== 'active'), isAlive: player.state === 'active'});
            }
            $scope.otherPlayers = otherPlayers;
            $scope.messages = gameService.messages;

            if ($scope.timerLength !== gameService.game.timer) {
                $scope.timerLength = gameService.game.timer;
                startRoundTimer(gameService.game.timer);
            }
        };
        updateProperties();

        $scope.doAction = function (target: string) {
            gameService.actOnTarget(target);
            updateProperties();
        };

        gameService.setGameChangedCallback(function () {
            if (!gameService.hasStarted) {
                gameService.setGameChangedCallback(null);
                location.hash = "#/lobby";
            } else {
                updateProperties();
                $scope.$digest();
            }
        });
    }]);
}