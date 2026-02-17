import mongoose from 'mongoose';

const guildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  guildName: { type: String, default: '' },

  // Welcome messages
  welcome: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    message: { type: String, default: 'Welcome {user} to {server}!' },
    embedEnabled: { type: Boolean, default: false },
    embedColor: { type: String, default: '#5865F2' },
    embedTitle: { type: String, default: '' },
    embedDescription: { type: String, default: '' },
  },

  // Onboarding (quick check flags, full config in OnboardingConfig)
  onboarding: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
  },

  // Tickets (quick check flags, full config in TicketConfig)
  tickets: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
  },

  // Moderation logs
  logs: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    events: {
      memberJoin: { type: Boolean, default: true },
      memberLeave: { type: Boolean, default: true },
      messageDelete: { type: Boolean, default: true },
      messageEdit: { type: Boolean, default: true },
      roleChange: { type: Boolean, default: true },
      channelChange: { type: Boolean, default: true },
      ban: { type: Boolean, default: true },
      kick: { type: Boolean, default: true },
    },
  },

  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: null },
});

guildConfigSchema.pre('save', function () {
  this.updatedAt = new Date();
});

export default mongoose.model('GuildConfig', guildConfigSchema);
