import mongoose from 'mongoose';

const optionSchema = new mongoose.Schema({
  label: { type: String, required: true },
  value: { type: String, required: true },
  description: { type: String, default: '' },
  emoji: {
    id: { type: String, default: null },       // Custom emoji ID
    name: { type: String, default: null },     // Custom emoji name
    unicode: { type: String, default: null },  // Unicode emoji character
  },
  action: {
    type: { type: String, enum: ['addRole'], default: 'addRole' },
    roleId: { type: String, default: null },
  },
}, { _id: false });

const componentSchema = new mongoose.Schema({
  type: { type: String, enum: ['button', 'dropdown'], required: true },
  placeholder: { type: String, default: '' },
  multiSelect: { type: Boolean, default: false },
  options: [optionSchema],
}, { _id: false });

const blockSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['message', 'delay', 'action'], required: true },
  content: { type: String, default: '' },
  delaySeconds: { type: Number, default: 5, min: 1, max: 300 },
  actionMessage: { type: String, default: '' },
  components: [componentSchema],
}, { _id: false });

const onboardingConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  enabled: { type: Boolean, default: false },
  channelId: { type: String, default: null },
  blocks: [blockSchema],
  updatedBy: { type: String, default: null },
}, { timestamps: true });

export default mongoose.model('OnboardingConfig', onboardingConfigSchema);
