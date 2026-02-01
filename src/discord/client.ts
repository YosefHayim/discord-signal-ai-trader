import { Client, GatewayIntentBits, Events, Partials } from 'discord.js';
import { createLogger } from '../utils/logger.js';
import { setAllowedChannels } from './filters/channel.filter.js';
import { setAllowedUsers } from './filters/user.filter.js';
import { handleMessage, setMessageCallback, type MessageCallback } from './handlers/message.handler.js';

const logger = createLogger('discord');

let client: Client | null = null;

export interface DiscordClientOptions {
  token: string;
  channelIds: string[];
  userIds: string[];
  onSignal: MessageCallback;
}

export function createDiscordClient(options: DiscordClientOptions): Client {
  if (client) {
    logger.warn('Discord client already exists');
    return client;
  }

  logger.info('Creating Discord client');

  setAllowedChannels(options.channelIds);
  setAllowedUsers(options.userIds);
  setMessageCallback(options.onSignal);

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.DirectMessages,
    ],
    partials: [
      Partials.Message,
      Partials.Channel,
    ],
  });

  client.once(Events.ClientReady, (readyClient) => {
    logger.info('Discord bot logged in', { 
      tag: readyClient.user.tag,
      id: readyClient.user.id,
    });
  });

  client.on(Events.MessageCreate, handleMessage);

  client.on(Events.Error, (error) => {
    logger.error('Discord client error', { error: error.message });
  });

  client.on(Events.Warn, (warning) => {
    logger.warn('Discord client warning', { warning });
  });

  if (process.env.NODE_ENV === 'development') {
    client.on(Events.Debug, (info) => {
      logger.debug('Discord debug', { info });
    });
  }

  return client;
}

export async function connectDiscord(token: string): Promise<void> {
  if (!client) {
    throw new Error('Discord client not created. Call createDiscordClient first.');
  }

  logger.info('Connecting to Discord...');
  await client.login(token);
}

export function getDiscordClient(): Client | null {
  return client;
}

export async function disconnectDiscord(): Promise<void> {
  if (client) {
    logger.info('Disconnecting Discord client');
    client.destroy();
    client = null;
  }
}

export function isDiscordConnected(): boolean {
  return client?.isReady() ?? false;
}
