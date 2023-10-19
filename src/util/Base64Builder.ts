import Axios from 'axios';

export class Base64Builder {
    public static convertToBase64(
        url: string,
        callback: Base64BuilderCallback
    ) {
        // exception
        if (!url) {
            callback('');
            return;
        }
        this.getBase64FromUri(url).then((base64) => {
            callback(base64);
        });
    }

    public static async getBase64FromUri(uri: string): Promise<string> {
        const res = await Axios.get(uri, {
            responseType: 'arraybuffer',
            timeout: 5000,
        });
        const base64 = Buffer.from(res.data, 'binary').toString('base64');
        const prefix = 'data:' + res.headers['content-type'] + ';base64,';
        const result: string = prefix + base64;

        return result;
    }
}

export type Base64BuilderCallback = (base64: string) => void;
