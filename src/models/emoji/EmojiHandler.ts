import { Logger } from '../../util/Logger';
import { EmojiDbManager } from './EmojiDbManager';
import { ImageKitHandler } from './ImageKitHandler';

export class EmojiHandler {
    #logger = new Logger('EmojiHandler');
    #db: EmojiDbManager = new EmojiDbManager();

    /**
     * 예시: 새로운 이모지 저장 (구현 필요)
     */
    public async saveEmoji(privKey: string, base64: string): Promise<boolean> {
        // TODO: privKey 인증, base64 디코딩 및 저장 로직 구현
        // 예시: DB에 저장 후 true/false 반환
        //new ImageKitHandler().uploadBase64()
        return false;
    }

    /**
     * 예시: 특정 유저의 이모지 모두 가져오기
     */
    public async getUserEmojis(userIdx: number) {
        return await this.#db.getEmojisByUser(userIdx);
    }
}
