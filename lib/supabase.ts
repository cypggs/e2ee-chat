/**
 * Supabase 客户端配置
 */

import { createClient } from '@supabase/supabase-js';

// 从环境变量获取 Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '缺少 Supabase 配置! 请在 .env.local 中设置 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}

/**
 * Supabase 客户端实例
 * 用于访问数据库和 Realtime 功能
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,  // 限制每秒事件数量
    },
  },
});

/**
 * 数据库类型定义 (与 database.sql 对应)
 */
export interface ChatRoom {
  id: string;
  created_at: string;
  expires_at: string;
  max_users: number;
}

export interface RoomParticipant {
  room_id: string;
  user_id: string;
  nickname: string;
  public_key: string;
  joined_at: string;
}
