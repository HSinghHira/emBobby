import { assignNewMemberRole } from '../services/verificationService.js';

/**
 * When a new member joins the guild, automatically assign them
 * the 🆕 New Member role (if the verification module is enabled
 * for that guild).
 */
export default {
  name: 'guildMemberAdd',
  async execute(member) {
    if (member.user.bot) return;

    await assignNewMemberRole(member);
  },
};