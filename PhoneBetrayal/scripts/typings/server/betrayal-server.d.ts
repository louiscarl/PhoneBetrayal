declare module Betrayal.Server {

    interface IPlayer {
        id: string;
        name: string;
        role: string;
        lives: number;
        state: string;
        score: number;
        hand: Array<string>;
    }

    interface IGame {
        id: number;
        timer: number;
        players: Array<IPlayer>;
        state: string;
        deskActions: Map<string, string>;
    }

    interface IJoinResponseData {
        game: IGame;
        player: IPlayer;
    }
}