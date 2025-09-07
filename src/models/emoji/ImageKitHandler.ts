import Axios from 'axios';
import { Config } from '../../Config';
import { Logger } from '../../util/Logger';
import ImageKit = require('imagekit');

export class ImageKitHandler {
    #imageKit = new ImageKit({
        publicKey: Config.IMAGEKIT_PUBLIC_KEY,
        privateKey: Config.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: Config.IMAGEKIT_ENDPOINT,
    });
    #logger: Logger = new Logger('ImageKitHandler');

    async upload(file: string, fileName: string) {
        try {
            const response = await this.#imageKit.upload({
                file: file, //required
                fileName: fileName, //required
                extensions: [
                    {
                        name: 'google-auto-tagging',
                        maxTags: 5,
                        minConfidence: 95,
                    },
                ],
                transformation: {
                    pre: 'l-text,i-Imagekit,fs-50,l-end',
                    post: [
                        {
                            type: 'transformation',
                            value: 'w-100',
                        },
                    ],
                },
            });
        } catch (error) {
            console.log(error);
        }
    }

    /**
     * base64에서 확장자 추출
     */
    #getExtensionFromBase64(base64: string): string {
        const match = base64.match(/^data:image\/([a-zA-Z0-9+]+);base64,/);
        return match ? match[1] : 'png'; // 기본값 png
    }

    /**
     * 이미지 업로드 (base64)
     */
    async uploadBase64(
        base64: string,
        fileName?: string
    ): Promise<ImageKitUploadResponse | null> {
        if (!this.#isImage(base64)) {
            this.#logger.e('uploadBase64: invalid base64');
            return null;
        }

        const ext = this.#getExtensionFromBase64(base64);
        const safeFileName = fileName
            ? fileName.endsWith(`.${ext}`)
                ? fileName
                : `${fileName}.${ext}`
            : `image_${Date.now()}.${ext}`;

        const content = this.#getImageContent(base64);
        try {
            const response = await this.#imageKit.upload({
                file: content,
                fileName: safeFileName,
                folder: 'emojis',
                tags: [safeFileName],
            });
            return response;
        } catch (e) {
            this.#logger.e('uploadBase64 error', e);
            return null;
        }
    }

    /**
     * 이미지 정보 조회
     */
    async getImage(fileId: string): Promise<ImageKitData | null> {
        const uri = `https://api.imagekit.io/v1/files/${fileId}`;
        const auth = {
            username: Config.IMAGEKIT_PRIVATE_KEY,
            password: '',
        };
        try {
            const res = await Axios.get<ImageKitData>(uri, { auth });
            if (res.status !== 200 || !res.data) {
                return null;
            }
            return res.data;
        } catch (e) {
            this.#logger.e('getImage error', e);
            return null;
        }
    }

    #isImage(base64: string): boolean {
        return /data:(image\/.*?);base64,(.*)/.test(base64);
    }

    #getImageContent(base64: string): string {
        return base64.replace(/data:(image\/.*?);base64,/, '');
    }
}

export type ImageKitData = {
    fileId: string;
    name: string;
    url: string;
    thumbnailUrl: string;
    height: number;
    width: number;
    size: number;
    filePath: string;
    fileType: string;
    mime: string;
    hasAlpha: boolean;
    // 기타 필요한 필드 추가
};

type ImageKitResponse = ImageKitData;

type ImageKitUploadResponse = {
    fileId: string;
    name: string;
    thumbnailUrl: string;
};
