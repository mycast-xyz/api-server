import { Logger } from '../../util/Logger';
import { HashGenerator } from '../hash/HashGenerator';
import { UserDbManager } from './UserDbManager';

export class UserSecretKeyManager {
    #logger = new Logger('UserSecretKeyManager');
    #db = new UserDbManager();
    #hashGenerator = new HashGenerator();

    async getOrCreateSecretKey(privateKey: string): Promise<string | null> {
        const loaded = await this.#db.getSecretKey(privateKey);
        if (loaded) {
            return loaded;
        } else {
            return await this.createSecretKey(privateKey);
        }
    }

    async createSecretKey(privateKey: string): Promise<string | null> {
        const generated = this.#hashGenerator.generate(privateKey);
        const result = await this.#db.setSecretKey(privateKey, generated);
        if (result) {
            return generated;
        }

        this.#logger.e('generated failed');
        return null;
    }
}
