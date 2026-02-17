import mongoose from 'mongoose';

const fieldSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  label: { type: String, required: true, maxlength: 45 },
  placeholder: { type: String, default: '', maxlength: 100 },
  style: { type: String, enum: ['short', 'paragraph'], default: 'short' },
  required: { type: Boolean, default: true },
  maxLength: { type: Number, default: 2000 },
}, { _id: false });

const actionSchema = new mongoose.Schema({
  type: { type: String, enum: ['webhook', 'private-thread'], required: true },
  webhookUrl: { type: String, default: null },
  threadChannelId: { type: String, default: null },
  notifyChannelId: { type: String, default: null },
}, { _id: false });

const ticketTypeSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true, maxlength: 100 },
  emoji: {
    id: { type: String, default: null },
    name: { type: String, default: null },
    unicode: { type: String, default: null },
  },
  description: { type: String, default: '', maxlength: 100 },
  fields: { type: [fieldSchema], validate: [v => v.length <= 5, 'Maximum 5 fields per ticket type'] },
  action: { type: actionSchema, required: true },
}, { _id: false });

const ticketConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  enabled: { type: Boolean, default: false },
  channelId: { type: String, default: null },
  ticketTypes: { type: [ticketTypeSchema], validate: [v => v.length <= 25, 'Maximum 25 ticket types'] },
  updatedBy: { type: String, default: null },
}, { timestamps: true });

export default mongoose.model('TicketConfig', ticketConfigSchema);
