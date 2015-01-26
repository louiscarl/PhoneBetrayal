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
                when('/lobby/:lobbyid', {
                    templateUrl: 'partials/player-lobby.html',
                    controller: 'LobbyCtrl'
                }).
                when('/join', {
                    templateUrl: 'partials/player-join.html',
                    controller: 'JoinCtrl'
                }).
                when('/playing/:lobbyid', {
                    templateUrl: 'partials/player-playing.html',
                    controller: 'PlayingCtrl'
                }).
                otherwise({
                    redirectTo: '/join'
                });
        }]);

    betrayalApp.factory('gameService', ['$cookieStore', function ($cookieStore: ng.cookies.ICookieStoreService) {
        var gameService = new Betrayal.GameService(socket, $cookieStore);

        return gameService;
    }]);

    betrayalApp.controller('JoinCtrl', ['$scope', 'gameService', function ($scope, gameService: GameService) {
        if (gameService.isConnected) {
            if (gameService.hasStarted) {
                location.hash = "#/playing/" + gameService.game.id;
            } else {
                location.hash = "#/lobby/" + gameService.game.id;
            }
            return;
        }

        $scope.joinAttempted = gameService.isJoining;

        $scope.playerName = gameService.name;

        $scope.hasError = false;

        $scope.isDisabled = false;

        $scope.joinGame = function () {
            if (!gameService.isJoining && ($scope.playerName.length >= 2)) {
                $scope.isDisabled = true;
                $scope.hasError = false;
                gameService.setName($scope.playerName);
                gameService.joinGame();
                $scope.joinAttempted = gameService.isJoining;
            }
        };

        gameService.setGameChangedCallback(function () {
            if (gameService.isJoining !== $scope.joinAttempted) {
                $scope.joinAttempted = gameService.isJoining;

                if (gameService.isConnected) {
                    gameService.setGameChangedCallback(null);
                    location.hash = "#/lobby/" + gameService.game.id;
                } else {
                    $scope.hasError = true;
                    $scope.$digest();
                }
            }
        });
    }]);

    betrayalApp.controller('LobbyCtrl', ['$scope', '$routeParams', 'gameService', function ($scope, $routeParams, gameService: GameService) {
        if (!gameService.isConnected) {
            location.hash = "#/join";
            return;
        }
        else if (gameService.hasStarted) {
            location.hash = "#/playing/" + gameService.game.id;
            return;
        }
        else if ($routeParams.lobbyid != gameService.game.id) {
            location.hash = "#/lobby/" + gameService.game.id;
            return;
        }

        var updateProperties = function () {
            var players = [];
            for (var i in gameService.otherPlayers) {
                var player = gameService.otherPlayers[i];
                players.push({ id: player.id, name: player.name, role: player.role, hasWon: player.success && player.role, hasLost: !player.success && player.role });
            }
            $scope.players = players;
            $scope.playerName = gameService.player.name;
            $scope.role = gameService.player.role;
            $scope.hasLost = !gameService.player.success && gameService.player.role;
            $scope.hasWon = gameService.player.success && gameService.player.role;

            $scope.isDisabled = $scope.players.length < 1;
        };
        updateProperties();

        $scope.startGame = function () {
            gameService.startGame();
        };

        gameService.setGameChangedCallback(function () {
            if (gameService.hasStarted) {
                gameService.setGameChangedCallback(null);
                location.hash = "#/playing/" + gameService.game.id;
            } else {
                updateProperties();
                $scope.$digest();
            }
        });
    }]);

    betrayalApp.controller('PlayingCtrl', ['$scope', '$routeParams', 'gameService', function ($scope, $routeParams, gameService: GameService) {
        if (!gameService.isConnected) {
            location.hash = "#/join";
            return;
        }
        else if (!gameService.hasStarted) {
            location.hash = "#/lobby/" + gameService.game.id;
            return;
        }
        else if ($routeParams.lobbyid != gameService.game.id) {
            location.hash = "#/playing/" + gameService.game.id;
            return;
        }

        var updateProperties = function () {
            $scope.role = gameService.player.role;
            $scope.name = gameService.name;
            $scope.action = gameService.game.deckActions[gameService.player.role];
            $scope.targetWhenDead = gameService.targetWhenDead();
            $scope.canAct = gameService.canAct;
            $scope.isAlive = gameService.player.state === 'active';
            $scope.imgName = gameService.player.role.toLowerCase() + ($scope.isAlive ? "" : "_dead");
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
                location.hash = "#/lobby/" + gameService.game.id;
            } else {
                updateProperties();
                $scope.$digest();
            }
        });
    }]);
}