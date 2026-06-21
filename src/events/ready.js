import { logger } from '../shared/logger.js';

export default {
  name: 'ready',
  once: true,
  execute(client) {
    logger.success(`Logged in as ${client.user.tag}.`);
  },
};
