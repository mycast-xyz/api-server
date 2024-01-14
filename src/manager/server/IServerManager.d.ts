import { AnimationData } from '../../models/Animation';
import * as AzurLane from '../../models/AzurLane';
import { BookInfo } from '../../models/BookInfo';
import * as Cq from '../../models/CrusaderQuest';
import * as Gf from '../../models/GirlsFrontline';
import * as Hos from '../../models/HeroesOfStorm';
import { MovieData } from '../../models/MovieData';
import { AfreecaResult } from '../loader/afreeca/AfreecaResult';
import { Loader } from '../loader/common/Loader';

export interface IServerManager {
    setIndexUri(uri: string): void;
    setRiotApiCode(code: string): void;

    setAnimationLoader(loader: Loader<string, AnimationData>): void;
    setAlShipLoader(loader: Loader<string, AzurLane.ShipInfo>): void;
    setBookLoader(loader: Loader<string, BookInfo>): void;
    setCqWarriorLoader(
        loader: Loader<{ name: string; star: number }, Cq.WarriorInfo>
    ): void;
    setGfDollLoader(loader: Loader<string, Gf.DollInfo>): void;
    setHosHeroLoader(loader: Loader<string, Hos.HeroInfo>): void;
    setMovieLoader(loader: Loader<string, MovieData>): void;
    setAfreecaLoader(loader: Loader<string, AfreecaResult>): void;

    start(welcomeMsg?: string): void;
}
