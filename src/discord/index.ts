export {
  createDiscordClient,
  connectDiscord,
  getDiscordClient,
  disconnectDiscord,
  isDiscordConnected,
  type DiscordClientOptions,
} from './client.js';

export { setAllowedChannels, isChannelAllowed, getAllowedChannels } from './filters/channel.filter.js';
export { setAllowedUsers, isUserAllowed, getAllowedUsers } from './filters/user.filter.js';
export { handleMessage, setMessageCallback, type MessageCallback } from './handlers/message.handler.js';
