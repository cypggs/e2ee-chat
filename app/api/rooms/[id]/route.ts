/**
 * 验证聊天室 API
 *
 * GET /api/rooms/[id]
 * 检查聊天室是否存在且未过期
 */

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: roomId } = await params;

    // 查询房间信息
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: '聊天室不存在', exists: false },
        { status: 404 }
      );
    }

    // 检查是否已过期
    const now = new Date();
    const expiresAt = new Date(data.expires_at);

    if (expiresAt < now) {
      return NextResponse.json(
        { error: '聊天室已过期', exists: false, expired: true },
        { status: 410 }  // 410 Gone
      );
    }

    // 计算剩余时间
    const expiresIn = expiresAt.getTime() - now.getTime();

    return NextResponse.json({
      exists: true,
      room: {
        id: data.id,
        createdAt: data.created_at,
        expiresAt: data.expires_at,
        expiresIn,
        maxUsers: data.max_users,
      },
    });
  } catch (error) {
    console.error('验证房间失败:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
