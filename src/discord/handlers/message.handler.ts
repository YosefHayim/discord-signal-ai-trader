import { Message, Attachment } from 'discord.js';
import { createLogger } from '../../utils/logger.js';
import { hashSignal } from '../../utils/hash.js';
import { isChannelAllowed } from '../filters/channel.filter.js';
import { isUserAllowed } from '../filters/user.filter.js';
import { SignalSource, type RawSignal } from '../../types/index.js';

const logger = createLogger('message-handler');

export type MessageCallback = (rawSignal: RawSignal) => Promise<void>;

let messageCallback: MessageCallback | null = null;

export function setMessageCallback(callback: MessageCallback): void {
  messageCallback = callback;
}

function isImageAttachment(attachment: Attachment): boolean {
  const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  if (attachment.contentType && imageTypes.includes(attachment.contentType)) {
    return true;
  }
  const ext = attachment.name?.toLowerCase().split('.').pop() || '';
  return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
}

async function downloadImage(url: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.error('Failed to download image', { url, status: response.status });
      return null;
    }
    
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = response.headers.get('content-type') || 'image/png';
    
    return { base64, mimeType };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error downloading image', { url, error: message });
    return null;
  }
}

export async function handleMessage(message: Message): Promise<void> {
  if (message.author.bot) return;

  if (!isChannelAllowed(message.channelId)) {
    logger.debug('Message from non-allowed channel', { channelId: message.channelId });
    return;
  }

  if (!isUserAllowed(message.author.id)) {
    logger.debug('Message from non-allowed user', { userId: message.author.id, tag: message.author.tag });
    return;
  }

  const hasContent = message.content.trim().length > 0;
  const imageAttachments = message.attachments.filter(isImageAttachment);
  const hasImages = imageAttachments.size > 0;

  if (!hasContent && !hasImages) {
    logger.debug('Message has no content or images, skipping');
    return;
  }

  logger.info('Processing signal message', {
    messageId: message.id,
    userId: message.author.id,
    userTag: message.author.tag,
    channelId: message.channelId,
    hasContent,
    imageCount: imageAttachments.size,
  });

  let imageData: { base64: string; mimeType: string } | null = null;
  if (hasImages) {
    const firstImage = imageAttachments.first();
    if (firstImage) {
      imageData = await downloadImage(firstImage.url);
    }
  }

  const rawSignal: RawSignal = {
    id: '',
    source: imageData ? SignalSource.DISCORD_IMAGE : SignalSource.DISCORD_TEXT,
    rawContent: message.content,
    imageBase64: imageData?.base64,
    imageMimeType: imageData?.mimeType,
    channelId: message.channelId,
    userId: message.author.id,
    messageId: message.id,
    hash: hashSignal(message.content + (imageData?.base64 || ''), message.id),
    receivedAt: new Date(),
  };

  if (messageCallback) {
    try {
      await messageCallback(rawSignal);
      await message.react('\u{1F440}').catch(() => {});
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error processing signal', { error: errorMessage });
      await message.react('\u274C').catch(() => {});
    }
  } else {
    logger.warn('No message callback set, signal not processed');
  }
}
