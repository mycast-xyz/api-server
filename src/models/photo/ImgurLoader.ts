import Axios from 'axios';

import { AsyncLoader } from '../../manager/loader/common/AsyncLoader';
import { LoaderCallback } from '../../manager/loader/common/Loader';
import { ImgurHandler } from './ImgurHandler';

export class ImgurLoader implements AsyncLoader<string, ImgurPhoto> {
    private mImgurHandler: ImgurHandler;

    public constructor() {
        this.mImgurHandler = new ImgurHandler();
    }

    public load(hash: string, callback: LoaderCallback<ImgurPhoto>): void {
        this.getResult(hash)
            .then((photo) => {
                callback(photo);
            })
            .catch(() => {
                callback(null);
            });
    }

    public async getResult(hash: string): Promise<ImgurPhoto | null> {
        return await this.mImgurHandler.getImage(hash);
    }
}

type ImgurPhoto = {
    id: string;
    type: string;
    animated: boolean;
    width: number;
    height: number;
    views: number;
    link: string;
};
