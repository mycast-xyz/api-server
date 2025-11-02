import { ChzzkLoader } from '../../../../models/chzzk/ChzzkLoader';
import { BaseRouter } from '../BaseRouter';

export class ChzzkRouter extends BaseRouter {
    public constructor() {
        super();

        this.getRouter().get('/', (req, res) => {
            res.send('chzzk hi');
        });

        this.getRouter().get('/channel/:channelId', (req, res) => {
            const { channelId } = req.params;
            new ChzzkLoader()
                .getProfile(channelId)
                .then((profile) => {
                    res.json(profile);
                })
                .catch((error) => {
                    res.status(500).json({ error: error.message });
                });
        });
    }
}
