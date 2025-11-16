'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  deriveSharedKey,
  encryptMessage,
  decryptMessage,
  generateUserId,
  getPublicKeyFingerprint,
} from '@/lib/crypto';
import { generateUniqueNickname } from '@/lib/nickname';
import type {
  Message,
  User,
  RoomInfo,
  PublicKeyBroadcast,
  EncryptedMessageBroadcast,
  PresenceState,
} from '@/lib/types';
import type { KeyPair, SerializablePublicKey } from '@/lib/crypto';
import type { RealtimeChannel } from '@supabase/supabase-js';

export default function ChatRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = params?.id as string;

  // 用户状态
  const [userId] = useState(() => generateUserId());
  const [nickname, setNickname] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  // Toast 通知状态
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // 房间状态
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // 加密状态 - 使用 useRef 来避免闭包陷阱
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const sharedKeysRef = useRef<Map<string, CryptoKey>>(new Map());
  const [sharedKeysVersion, setSharedKeysVersion] = useState(0); // 触发重渲染

  // 聊天状态
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Realtime Channel
  const channelRef = useRef<RealtimeChannel | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const keyPairRef = useRef<KeyPair | null>(null);
  const userIdRef = useRef(userId);
  const nicknameRef = useRef('');

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 验证房间是否存在
  useEffect(() => {
    const verifyRoom = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomId}`);
        const data = await response.json();

        if (!response.ok || !data.exists) {
          if (data.expired) {
            setError('此聊天室已过期');
          } else {
            setError('聊天室不存在');
          }
          setIsLoading(false);
          return;
        }

        setRoomInfo({
          id: data.room.id,
          createdAt: data.room.createdAt,
          expiresAt: data.room.expiresAt,
          expiresIn: data.room.expiresIn,
          maxUsers: data.room.maxUsers,
        });

        setIsLoading(false);
      } catch (err) {
        console.error('验证房间失败:', err);
        setError('无法连接到服务器');
        setIsLoading(false);
      }
    };

    if (roomId) {
      verifyRoom();
    }
  }, [roomId]);

  // 自动生成昵称
  useEffect(() => {
    if (!nickname && onlineUsers.length >= 0) {
      const existingNicknames = onlineUsers.map((u) => u.nickname);
      const generatedNickname = generateUniqueNickname(existingNicknames);
      setNickname(generatedNickname);
    }
  }, [nickname, onlineUsers]);

  // 加入聊天室
  const handleJoinRoom = useCallback(async () => {
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }

    if (nickname.trim().length > 20) {
      setError('昵称最多20个字符');
      return;
    }

    nicknameRef.current = nickname.trim();

    try {
      // 1. 生成密钥对
      const keys = await generateKeyPair();
      setKeyPair(keys);
      keyPairRef.current = keys;

      const publicKey = await exportPublicKey(keys.publicKey);
      const fingerprint = await getPublicKeyFingerprint(keys.publicKey);

      console.log('🔐 密钥对已生成');
      console.log('📌 公钥指纹:', fingerprint);

      // 2. 连接 Supabase Realtime
      const channel = supabase.channel(`room:${roomId}`, {
        config: {
          broadcast: { self: true },  // 接收自己的广播
          presence: { key: userId },
        },
      });

      // 3. 监听 Presence 变化 (在线用户)
      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState<PresenceState>();
          const users: User[] = Object.values(state).flatMap((presences) =>
            presences.map((p) => ({
              id: p.userId,
              nickname: p.nickname,
              isOnline: true,
            }))
          );
          setOnlineUsers(users);
        })
        .on('presence', { event: 'join' }, ({ newPresences }) => {
          console.log('👋 用户加入:', newPresences);
        })
        .on('presence', { event: 'leave' }, ({ leftPresences }) => {
          console.log('👋 用户离开:', leftPresences);
        });

      // 4. 监听公钥广播 (密钥交换)
      channel.on(
        'broadcast',
        { event: 'public-key' },
        async ({ payload }: { payload: PublicKeyBroadcast }) => {
          if (payload.userId === userIdRef.current) return; // 忽略自己的公钥

          try {
            // 检查是否已经有这个用户的密钥
            const existingKey = sharedKeysRef.current.get(payload.userId);

            console.log(`🔑 收到 ${payload.nickname} 的公钥`);

            // 导入对方的公钥
            const theirPublicKey = await importPublicKey(payload.publicKey);

            // 使用 ref 获取最新的私钥
            if (!keyPairRef.current) {
              console.error('密钥对未初始化');
              return;
            }

            // 派生共享密钥
            const sharedKey = await deriveSharedKey(keyPairRef.current.privateKey, theirPublicKey);

            // 保存共享密钥到 ref
            sharedKeysRef.current.set(payload.userId, sharedKey);
            setSharedKeysVersion((v) => v + 1); // 触发重渲染

            console.log(`✅ 已与 ${payload.nickname} 建立加密通道`);
            console.log(`📊 当前共享密钥数量: ${sharedKeysRef.current.size}`);

            // 如果这是新用户（之前没有密钥），回复自己的公钥
            // 这确保了双向密钥交换
            if (!existingKey) {
              console.log(`📤 回复公钥给 ${payload.nickname}`);
              await channel.send({
                type: 'broadcast',
                event: 'public-key',
                payload: {
                  userId: userIdRef.current,
                  nickname: nicknameRef.current,
                  publicKey,
                  timestamp: Date.now(),
                } as PublicKeyBroadcast,
              });
            }
          } catch (err) {
            console.error('密钥交换失败:', err);
          }
        }
      );

      // 5. 监听加密消息
      channel.on(
        'broadcast',
        { event: 'message' },
        async ({ payload }: { payload: any }) => {
          try {
            const isOwnMessage = payload.senderId === userIdRef.current;

            // 如果是自己发送的消息，直接使用明文（发送时已保存）
            if (isOwnMessage) {
              // 自己的消息已经在发送时添加了，跳过
              return;
            }

            // 新格式：encryptedMessages 数组
            if (payload.encryptedMessages) {
              // 查找属于自己的密文
              const myEncryptedMessage = payload.encryptedMessages.find(
                (msg: { recipientId: string }) => msg.recipientId === userIdRef.current
              );

              if (!myEncryptedMessage) {
                console.warn(`⚠️ 消息中没有给我的密文`);
                return;
              }

              // 获取发送者的共享密钥
              const sharedKey = sharedKeysRef.current.get(payload.senderId);

              if (!sharedKey) {
                console.warn(`⚠️ 未找到 ${payload.senderNickname} 的密钥,无法解密消息`);
                return;
              }

              // 解密消息
              const decryptedContent = await decryptMessage(myEncryptedMessage.encrypted, sharedKey);

              const message: Message = {
                id: payload.messageId,
                senderId: payload.senderId,
                senderNickname: payload.senderNickname,
                content: decryptedContent,
                timestamp: payload.timestamp,
                isOwn: false,
              };

              setMessages((prev) => [...prev, message]);
              console.log(`📨 收到来自 ${payload.senderNickname} 的消息`);
            } else if (payload.encrypted) {
              // 旧格式兼容：单个 encrypted 字段
              const sharedKey = sharedKeysRef.current.get(payload.senderId);

              if (!sharedKey) {
                console.warn(`⚠️ 未找到 ${payload.senderNickname} 的密钥,无法解密消息`);
                return;
              }

              const decryptedContent = await decryptMessage(payload.encrypted, sharedKey);

              const message: Message = {
                id: payload.messageId,
                senderId: payload.senderId,
                senderNickname: payload.senderNickname,
                content: decryptedContent,
                timestamp: payload.timestamp,
                isOwn: false,
              };

              setMessages((prev) => [...prev, message]);
              console.log(`📨 收到来自 ${payload.senderNickname} 的消息 (旧格式)`);
            }
          } catch (err) {
            console.error('消息解密失败:', err);
          }
        }
      );

      // 6. 订阅频道
      await channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ 已连接到聊天室');

          // 广播自己的 Presence
          await channel.track({
            userId: userIdRef.current,
            nickname: nicknameRef.current,
            joinedAt: Date.now(),
          });

          // 广播自己的公钥
          await channel.send({
            type: 'broadcast',
            event: 'public-key',
            payload: {
              userId: userIdRef.current,
              nickname: nicknameRef.current,
              publicKey,
              timestamp: Date.now(),
            } as PublicKeyBroadcast,
          });

          setHasJoined(true);
        }
      });

      channelRef.current = channel;
    } catch (err) {
      console.error('加入房间失败:', err);
      setError('加入房间失败,请刷新页面重试');
    }
  }, [nickname, roomId, userId]);

  // 发送消息
  const handleSendMessage = useCallback(async () => {
    if (!messageInput.trim() || !channelRef.current || isSending) return;

    setIsSending(true);
    const messageContent = messageInput.trim();
    setMessageInput(''); // 立即清空输入框

    try {
      const messageId = crypto.randomUUID();
      const timestamp = Date.now();

      // 获取所有在线用户的共享密钥
      const recipientKeys = Array.from(sharedKeysRef.current.entries());

      // 无论是否有其他用户，都显示自己的消息
      const ownMessage: Message = {
        id: messageId,
        senderId: userId,
        senderNickname: nicknameRef.current,
        content: messageContent,
        timestamp,
        isOwn: true,
      };
      setMessages((prev) => [...prev, ownMessage]);

      if (recipientKeys.length === 0) {
        console.warn('⚠️ 暂无其他用户在线，消息仅本地显示');
        setIsSending(false);
        return;
      }

      // 为每个用户单独加密消息（群聊支持）
      const encryptedMessages: { recipientId: string; encrypted: Awaited<ReturnType<typeof encryptMessage>> }[] = [];

      for (const [recipientId, sharedKey] of recipientKeys) {
        const encrypted = await encryptMessage(messageContent, sharedKey);
        encryptedMessages.push({ recipientId, encrypted });
      }

      // 广播加密消息（包含所有接收者的密文）
      await channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: {
          messageId,
          senderId: userId,
          senderNickname: nicknameRef.current,
          encryptedMessages, // 新字段：每个用户对应的密文
          timestamp,
        },
      });

      console.log(`📤 消息已发送给 ${recipientKeys.length} 个用户`);
    } catch (err) {
      console.error('发送消息失败:', err);
      // 发送失败时提示用户
      setError('消息发送失败，请重试');
    } finally {
      setIsSending(false);
    }
  }, [messageInput, userId, isSending]);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  // 复制房间链接
  const copyRoomLink = () => {
    const link = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(link);
    setToastMessage('房间链接已复制!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // 加载中
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载聊天室...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error && !roomInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">{error}</h3>
            <button
              onClick={() => router.push('/')}
              className="mt-4 bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600"
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 加入聊天室前的昵称输入
  if (!hasJoined) {
    const expiresIn = roomInfo ? Math.floor(roomInfo.expiresIn / 1000 / 60) : 0;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">加入加密聊天室</h2>
            <p className="text-sm text-gray-500">此房间将在 {expiresIn} 分钟后过期</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              设置您的昵称
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleJoinRoom();
                }
              }}
              placeholder="输入昵称 (最多20字符)"
              maxLength={20}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              autoFocus
            />
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleJoinRoom}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg mb-4"
          >
            加入聊天室
          </button>

          <button
            onClick={() => router.push('/')}
            className="w-full text-gray-600 py-2 hover:text-gray-900"
          >
            返回首页
          </button>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              加入后将自动生成密钥对,所有消息均在浏览器本地加密
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 聊天室主界面
  const expiresIn = roomInfo ? Math.floor(roomInfo.expiresIn / 1000 / 60) : 0;

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-gray-900">加密聊天室</h1>
            <p className="text-xs text-gray-500">{expiresIn} 分钟后过期</p>
          </div>
        </div>
        <button
          onClick={copyRoomLink}
          className="bg-blue-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
        >
          复制邀请链接
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p>暂无消息,开始聊天吧!</p>
                <p className="text-xs mt-2">请确保对方也已加入聊天室</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${msg.isOwn ? 'order-2' : 'order-1'}`}>
                    {!msg.isOwn && (
                      <p className="text-xs text-gray-500 mb-1">{msg.senderNickname}</p>
                    )}
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        msg.isOwn
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      <p className="break-words">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          msg.isOwn ? 'text-blue-100' : 'text-gray-400'
                        }`}
                      >
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t bg-white p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="输入消息... (Enter 发送)"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || isSending}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? '...' : '发送'}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar - Online Users */}
        <div className="w-64 bg-white border-l p-4 hidden md:block">
          <h3 className="font-semibold text-gray-900 mb-3">
            在线用户 ({onlineUsers.length})
          </h3>
          <div className="space-y-2">
            {onlineUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-700">
                  {user.nickname}
                  {user.id === userId && (
                    <span className="text-xs text-gray-400"> (你)</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">
              已建立加密通道: {sharedKeysRef.current.size}
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="bg-green-50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div>
                  <p className="text-xs font-semibold text-green-900 mb-1">端到端加密已启用</p>
                  <p className="text-xs text-green-700">服务器无法读取消息内容</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast 通知 */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
