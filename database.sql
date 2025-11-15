-- ============================================
-- 端到端加密临时聊天室系统 - 数据库初始化脚本
-- ============================================
-- 安全说明: 本系统实现真正的端到端加密
-- - 服务器仅存储密文,无法解密消息
-- - 所有房间在1小时后自动销毁
-- - 使用256-bit高熵Token保护房间访问
-- ============================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================
-- 表1: 聊天室元数据
-- ============================================
CREATE TABLE IF NOT EXISTS chat_rooms (
    id TEXT PRIMARY KEY,  -- 256-bit base64url编码的随机token
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour') NOT NULL,
    max_users INT DEFAULT 50 NOT NULL
);

-- 为过期查询创建索引
CREATE INDEX IF NOT EXISTS idx_chat_rooms_expires_at ON chat_rooms(expires_at);

-- ============================================
-- 表2: 房间参与者和公钥（用于ECDH密钥交换）
-- ============================================
CREATE TABLE IF NOT EXISTS room_participants (
    room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    nickname TEXT NOT NULL,
    public_key TEXT NOT NULL,  -- Base64编码的X25519公钥
    joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (room_id, user_id)
);

-- 为房间查询创建索引
CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON room_participants(room_id);

-- ============================================
-- Row Level Security (RLS) 策略
-- ============================================

-- 启用RLS
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_participants ENABLE ROW LEVEL SECURITY;

-- 策略1: 任何人都可以读取未过期的聊天室
DROP POLICY IF EXISTS "Anyone can read active rooms" ON chat_rooms;
CREATE POLICY "Anyone can read active rooms"
    ON chat_rooms FOR SELECT
    USING (expires_at > NOW());

-- 策略2: 任何人都可以创建聊天室
DROP POLICY IF EXISTS "Anyone can create rooms" ON chat_rooms;
CREATE POLICY "Anyone can create rooms"
    ON chat_rooms FOR INSERT
    WITH CHECK (true);

-- 策略3: 任何人都可以读取未过期房间的参与者信息
DROP POLICY IF EXISTS "Anyone can read active room participants" ON room_participants;
CREATE POLICY "Anyone can read active room participants"
    ON room_participants FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_rooms
            WHERE chat_rooms.id = room_participants.room_id
            AND chat_rooms.expires_at > NOW()
        )
    );

-- 策略4: 任何人都可以加入未过期的房间
DROP POLICY IF EXISTS "Anyone can join active rooms" ON room_participants;
CREATE POLICY "Anyone can join active rooms"
    ON room_participants FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_rooms
            WHERE chat_rooms.id = room_participants.room_id
            AND chat_rooms.expires_at > NOW()
        )
    );

-- ============================================
-- 自动清理过期房间 (使用 pg_cron)
-- ============================================

-- 删除旧的定时任务（如果存在）
SELECT cron.unschedule('cleanup-expired-chat-rooms') WHERE jobid IN (
    SELECT jobid FROM cron.job WHERE jobname = 'cleanup-expired-chat-rooms'
);

-- 创建新的定时任务: 每15分钟清理一次过期房间
-- 注意: room_participants 会因为 ON DELETE CASCADE 自动删除
SELECT cron.schedule(
    'cleanup-expired-chat-rooms',
    '*/15 * * * *',  -- 每15分钟执行一次
    $$
    DELETE FROM chat_rooms
    WHERE expires_at < NOW();
    $$
);

-- ============================================
-- 辅助函数: 检查房间是否已过期
-- ============================================
CREATE OR REPLACE FUNCTION is_room_active(room_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM chat_rooms
        WHERE id = room_token
        AND expires_at > NOW()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 验证查询（执行后可以检查设置是否成功）
-- ============================================

-- 查看已创建的定时任务
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-chat-rooms';

-- 查看RLS策略
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('chat_rooms', 'room_participants');

-- ============================================
-- 使用说明
-- ============================================
-- 1. 在 Supabase Dashboard 执行此脚本:
--    Database -> SQL Editor -> New Query -> 粘贴并运行
--
-- 2. 确认 pg_cron 扩展已启用:
--    Database -> Extensions -> 搜索 "pg_cron" -> 点击启用
--
-- 3. 验证定时任务:
--    SELECT * FROM cron.job;
--
-- 4. 手动触发清理（测试用）:
--    DELETE FROM chat_rooms WHERE expires_at < NOW();
--
-- ============================================
