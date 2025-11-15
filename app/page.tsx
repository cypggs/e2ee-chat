'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');

  // 创建新的聊天室
  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError('');

    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('创建聊天室失败');
      }

      const data = await response.json();

      // 跳转到聊天室页面
      router.push(`/room/${data.room.id}`);
    } catch (err) {
      setError('创建聊天室失败,请重试');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  // 加入已有聊天室
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!roomId.trim()) {
      setError('请输入聊天室ID');
      return;
    }

    router.push(`/room/${roomId.trim()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">加密聊天室</h1>
              <p className="text-xs text-gray-500">端到端加密 · 临时通信</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            安全的临时加密聊天室
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            无需注册,创建即用。采用军事级端到端加密,所有消息在1小时后自动销毁,服务器无法解密您的聊天内容。
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Create Room Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">创建聊天室</h3>
            <p className="text-gray-600 mb-6">
              立即创建一个新的加密聊天室,分享链接给您的朋友即可开始安全通信。
            </p>
            <button
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
            >
              {isCreating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  创建中...
                </span>
              ) : (
                '创建新聊天室'
              )}
            </button>
          </div>

          {/* Join Room Card */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">加入聊天室</h3>
            <p className="text-gray-600 mb-6">
              已经有聊天室ID? 输入ID即可加入已有的加密聊天室。
            </p>
            <form onSubmit={handleJoinRoom}>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="输入聊天室 ID"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all shadow-md hover:shadow-lg"
              >
                加入聊天室
              </button>
            </form>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-8">
            {error}
          </div>
        )}

        {/* Security Features */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">安全特性</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">端到端加密</h4>
              <p className="text-sm text-gray-600">使用 X25519 + AES-256-GCM 军事级加密算法</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">自动销毁</h4>
              <p className="text-sm text-gray-600">所有聊天记录在1小时后自动彻底销毁</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className="font-semibold text-gray-900 mb-2">无需注册</h4>
              <p className="text-sm text-gray-600">打开即用,不保存任何个人信息</p>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-8 bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">技术说明</h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>密钥交换:</strong> 采用 X25519 (Curve25519) ECDH 协议,每个用户生成临时密钥对</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>消息加密:</strong> AES-256-GCM 对称加密,每条消息使用独立的 96-bit 随机 IV</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>服务器盲化:</strong> 服务器仅存储和转发密文,无法解密任何消息内容</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">✓</span>
              <span><strong>房间保护:</strong> 使用 256-bit 高熵随机 token,碰撞概率可忽略不计</span>
            </li>
          </ul>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center text-sm text-gray-500">
          <p>本系统采用真正的端到端加密,所有加密解密操作均在您的浏览器本地完成</p>
          <p className="mt-1">服务器无法访问您的聊天内容,请放心使用</p>
        </div>
      </footer>
    </div>
  );
}
