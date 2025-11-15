/**
 * 端到端加密核心模块
 *
 * 使用军事级加密算法:
 * - X25519 (Curve25519) ECDH 密钥交换
 * - AES-256-GCM 对称加密
 * - 每条消息使用独立的 96-bit IV/nonce
 *
 * 安全保证:
 * - 所有密钥仅存在于客户端内存,永不持久化
 * - 服务器仅存储/转发密文
 * - 使用 Web Crypto API (浏览器原生实现,高性能)
 */

/**
 * 密钥对类型
 */
export interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

/**
 * 加密后的消息
 */
export interface EncryptedMessage {
  ciphertext: number[];  // 密文 (ArrayBuffer转数组用于JSON传输)
  iv: number[];          // 初始化向量 (96-bit)
}

/**
 * 公钥的可序列化格式
 */
export interface SerializablePublicKey {
  key: number[];  // ArrayBuffer转数组
}

/**
 * 生成 X25519 密钥对用于 ECDH 密钥交换
 *
 * @returns Promise<KeyPair> - 包含公钥和私钥的密钥对
 */
export async function generateKeyPair(): Promise<KeyPair> {
  try {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'X25519',
      },
      true,  // extractable (允许导出公钥)
      ['deriveKey', 'deriveBits']  // 用途: 密钥派生
    ) as CryptoKeyPair;  // Type assertion since X25519 always returns CryptoKeyPair

    return {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
    };
  } catch (error) {
    console.error('密钥对生成失败:', error);
    throw new Error('无法生成加密密钥对');
  }
}

/**
 * 将公钥导出为可序列化的格式 (用于通过网络传输)
 *
 * @param publicKey - CryptoKey 格式的公钥
 * @returns Promise<SerializablePublicKey> - 可序列化的公钥
 */
export async function exportPublicKey(
  publicKey: CryptoKey
): Promise<SerializablePublicKey> {
  try {
    const exported = await crypto.subtle.exportKey('raw', publicKey);
    return {
      key: Array.from(new Uint8Array(exported)),
    };
  } catch (error) {
    console.error('公钥导出失败:', error);
    throw new Error('无法导出公钥');
  }
}

/**
 * 将可序列化的公钥导入为 CryptoKey 格式
 *
 * @param serializedKey - 可序列化的公钥
 * @returns Promise<CryptoKey> - CryptoKey 格式的公钥
 */
export async function importPublicKey(
  serializedKey: SerializablePublicKey
): Promise<CryptoKey> {
  try {
    const keyBuffer = new Uint8Array(serializedKey.key);
    return await crypto.subtle.importKey(
      'raw',
      keyBuffer,
      {
        name: 'X25519',
      },
      false,  // 不需要导出
      []      // 对方的公钥不需要用途
    );
  } catch (error) {
    console.error('公钥导入失败:', error);
    throw new Error('无法导入公钥');
  }
}

/**
 * 使用 ECDH 协议派生共享密钥
 *
 * @param myPrivateKey - 自己的私钥
 * @param theirPublicKey - 对方的公钥
 * @returns Promise<CryptoKey> - 派生的 AES-256-GCM 密钥
 */
export async function deriveSharedKey(
  myPrivateKey: CryptoKey,
  theirPublicKey: CryptoKey
): Promise<CryptoKey> {
  try {
    // 执行 ECDH 密钥协商
    const sharedKey = await crypto.subtle.deriveKey(
      {
        name: 'X25519',
        public: theirPublicKey,
      },
      myPrivateKey,
      {
        name: 'AES-GCM',
        length: 256,  // 256-bit 密钥
      },
      false,  // 不可导出 (安全)
      ['encrypt', 'decrypt']  // 用途: 加密和解密
    );

    return sharedKey;
  } catch (error) {
    console.error('密钥派生失败:', error);
    throw new Error('无法派生共享密钥');
  }
}

/**
 * 使用 AES-256-GCM 加密消息
 *
 * @param message - 明文消息
 * @param key - AES-256-GCM 密钥
 * @returns Promise<EncryptedMessage> - 加密后的消息 (包含密文和IV)
 */
export async function encryptMessage(
  message: string,
  key: CryptoKey
): Promise<EncryptedMessage> {
  try {
    // 生成随机的 96-bit IV (每条消息独立)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // 将消息编码为 UTF-8 字节
    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);

    // 使用 AES-256-GCM 加密
    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,  // 128-bit 认证标签
      },
      key,
      messageBytes
    );

    return {
      ciphertext: Array.from(new Uint8Array(ciphertext)),
      iv: Array.from(iv),
    };
  } catch (error) {
    console.error('消息加密失败:', error);
    throw new Error('无法加密消息');
  }
}

/**
 * 使用 AES-256-GCM 解密消息
 *
 * @param encryptedMessage - 加密的消息 (包含密文和IV)
 * @param key - AES-256-GCM 密钥
 * @returns Promise<string> - 解密后的明文消息
 */
export async function decryptMessage(
  encryptedMessage: EncryptedMessage,
  key: CryptoKey
): Promise<string> {
  try {
    // 将数组转换回 ArrayBuffer
    const ciphertext = new Uint8Array(encryptedMessage.ciphertext);
    const iv = new Uint8Array(encryptedMessage.iv);

    // 使用 AES-256-GCM 解密
    const decryptedBytes = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128,
      },
      key,
      ciphertext
    );

    // 将字节解码为 UTF-8 字符串
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBytes);
  } catch (error) {
    console.error('消息解密失败:', error);
    throw new Error('无法解密消息 (密钥可能不匹配或消息已损坏)');
  }
}

/**
 * 生成随机的用户ID (用于临时身份标识)
 *
 * @returns string - 基于 UUID v4 的用户ID
 */
export function generateUserId(): string {
  return crypto.randomUUID();
}

/**
 * 生成公钥指纹 (用于验证密钥交换,防止中间人攻击)
 *
 * @param publicKey - 公钥
 * @returns Promise<string> - 公钥的 SHA-256 哈希 (前16字符)
 */
export async function getPublicKeyFingerprint(
  publicKey: CryptoKey
): Promise<string> {
  try {
    const exported = await crypto.subtle.exportKey('raw', publicKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', exported);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // 返回前16个字符作为指纹
    return hashHex.substring(0, 16).toUpperCase();
  } catch (error) {
    console.error('生成指纹失败:', error);
    return '';
  }
}

/**
 * 辅助函数: 将 ArrayBuffer 转换为 Base64 字符串
 *
 * @param buffer - ArrayBuffer
 * @returns string - Base64 编码的字符串
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * 辅助函数: 将 Base64 字符串转换为 ArrayBuffer
 *
 * @param base64 - Base64 编码的字符串
 * @returns ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
