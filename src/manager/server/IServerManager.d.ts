import { AnimationData } from '../../models/Animation';
import { BookInfo } from '../../models/BookInfo';
import { MovieData } from '../../models/MovieData';
import { AfreecaResult } from '../loader/afreeca/AfreecaResult';
import { Loader } from '../loader/common/Loader';

export interface IServerManager {
    setIndexUri(uri: string): void;
    setRiotApiCode(code: string): void;

    setAnimationLoader(loader: Loader<string, AnimationData>): void;
    setBookLoader(loader: Loader<string, BookInfo>): void;
    setMovieLoader(loader: Loader<string, MovieData>): void;
    setAfreecaLoader(loader: Loader<string, AfreecaResult>): void;

    start(welcomeMsg?: string): void;
}
