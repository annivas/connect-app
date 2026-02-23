import type { Message } from '../types';

/**
 * Given an inverted message list (newest first) and a current index,
 * determines if this message is part of a consecutive image group from
 * the same sender, and returns the group info.
 *
 * Returns:
 * - `null` if this message is not an image
 * - `{ isLeader: false }` if this image is part of a group but is NOT
 *    the leader (the newest/first in the inverted list) — should be hidden
 * - `{ isLeader: true, images: Message[] }` if this is the leader — should
 *    render the PhotoGrid with the collected images
 */
export function getImageGroup(
  invertedMessages: Message[],
  index: number,
): { isLeader: true; images: Message[] } | { isLeader: false } | null {
  const msg = invertedMessages[index];
  if (msg.type !== 'image') return null;

  // Collect all consecutive images from the same sender, starting at this index
  // and going towards older messages (higher indices in inverted list)
  const senderId = msg.senderId;

  // Find the start of the group (the newest image = lowest index in inverted list)
  let groupStart = index;
  while (groupStart > 0) {
    const prev = invertedMessages[groupStart - 1];
    if (prev.type !== 'image' || prev.senderId !== senderId) break;
    groupStart--;
  }

  // Find the end of the group (the oldest image = highest index in inverted list)
  let groupEnd = index;
  while (groupEnd < invertedMessages.length - 1) {
    const next = invertedMessages[groupEnd + 1];
    if (next.type !== 'image' || next.senderId !== senderId) break;
    groupEnd++;
  }

  const groupSize = groupEnd - groupStart + 1;
  if (groupSize <= 1) return null; // Single image, no grouping needed

  // The "leader" is the newest message in the group (lowest index in inverted)
  if (index === groupStart) {
    // Collect images in chronological order (oldest first) for the grid
    const images: Message[] = [];
    for (let i = groupEnd; i >= groupStart; i--) {
      images.push(invertedMessages[i]);
    }
    return { isLeader: true, images };
  }

  // This image is part of a group but not the leader — hide it
  return { isLeader: false };
}
