/**
 * TypeScript 类型定义
 */

import type { EncryptedMessage, SerializablePublicKey } from './crypto';

/**
 * 消息类型
 */
export interface Message {
  id: string;
  senderId: string;
  senderNickname: string;
  content: string;  // 解密后的明文内容
  timestamp: number;
  isOwn: boolean;   // 是否是自己发送的消息
}

/**
 * 通过 Supabase Realtime Broadcast 传输的公钥交换消息
 */
export interface PublicKeyBroadcast {
  userId: string;
  nickname: string;
  publicKey: SerializablePublicKey;
  timestamp: number;
}

/**
 * 通过 Supabase Realtime Broadcast 传输的加密消息
 */
export interface EncryptedMessageBroadcast {
  messageId: string;
  senderId: string;
  senderNickname: string;
  encrypted: EncryptedMessage;
  timestamp: number;
}

/**
 * Supabase Realtime Presence 状态
 */
export interface PresenceState {
  userId: string;
  nickname: string;
  joinedAt: number;
}

/**
 * 用户信息
 */
export interface User {
  id: string;
  nickname: string;
  isOnline: boolean;
}

/**
 * 房间信息
 */
export interface RoomInfo {
  id: string;
  createdAt: string;
  expiresAt: string;
  expiresIn: number;  // 距离过期的毫秒数
  maxUsers: number;
}
