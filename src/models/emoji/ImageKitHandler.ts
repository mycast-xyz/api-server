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

    async getImage(fileId: string): Promise<ImageKitData | null> {
        try {
            const res = await this.#imageKit.getFileDetails(fileId);
            return {
                fileId: res.fileId,
                name: res.name,
                url: res.url,
                thumbnail: res.thumbnail,
                height: res.height,
                width: res.width,
                size: res.size,
                filePath: res.filePath,
                fileType: res.fileType,
                mime: res.mime,
                hasAlpha: res.hasAlpha,
            };
        } catch (e) {
            this.#logger.e('getImage error', e);
            return null;
        }
    }

    getResizedUrl(url: string, size: number): string {
        const u = new URL(url);
        const params = u.searchParams;
        params.append('tr', `w-${size},h-${size}`);
        u.search = params.toString();
        return u.toString();
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
    thumbnail: string;
    height: number;
    width: number;
    size: number;
    filePath: string;
    fileType: string;
    mime?: string;
    hasAlpha: boolean;
};

type ImageKitResponse = ImageKitData;

type ImageKitUploadResponse = {
    fileId: string;
    name: string;
    thumbnailUrl: string;
};
