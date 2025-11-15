/**
 * 创建聊天室 API
 *
 * POST /api/rooms
 * 生成256-bit高熵token并在数据库中创建聊天室
 */

import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { supabase } from '@/lib/supabase';

export async function POST() {
  try {
    // 生成 256-bit 高熵 token (base64url 编码,URL安全)
    const roomId = randomBytes(32)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 计算过期时间 (1小时后)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);  // +1小时

    // 在数据库中创建房间记录
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        id: roomId,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
        max_users: 50,
      })
      .select()
      .single();

    if (error) {
      console.error('数据库错误:', error);
      return NextResponse.json(
        { error: '创建聊天室失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      room: {
        id: data.id,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
        maxUsers: data.max_users,
      },
    });
  } catch (error) {
    console.error('创建房间失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
