/**
 * 随机昵称生成器 - 军事隐匿风格
 * 生成类似 "影狼 · ShadowWolf" 的代号
 */

// 前缀词（冷感、军事风）
const prefixes = [
  { zh: '影', en: 'Shadow' },
  { zh: '寂', en: 'Silent' },
  { zh: '灰', en: 'Grey' },
  { zh: '暗', en: 'Dark' },
  { zh: '凛', en: 'Cold' },
  { zh: '夜', en: 'Night' },
  { zh: '霜', en: 'Frost' },
  { zh: '冷', en: 'Ice' },
  { zh: '幽', en: 'Ghost' },
  { zh: '漠', en: 'Desert' },
  { zh: '雾', en: 'Mist' },
  { zh: '钢', en: 'Steel' },
  { zh: '铁', en: 'Iron' },
  { zh: '血', en: 'Blood' },
  { zh: '锋', en: 'Blade' },
  { zh: '隐', en: 'Hidden' },
  { zh: '孤', en: 'Lone' },
  { zh: '荒', en: 'Wild' },
  { zh: '寒', en: 'Chill' },
  { zh: '墨', en: 'Ink' },
];

// 动物（攻击性或侦察感）
const animals = [
  { zh: '狼', en: 'Wolf' },
  { zh: '鹫', en: 'Eagle' },
  { zh: '狐', en: 'Fox' },
  { zh: '隼', en: 'Falcon' },
  { zh: '豹', en: 'Leopard' },
  { zh: '鸮', en: 'Owl' },
  { zh: '貂', en: 'Marten' },
  { zh: '鹗', en: 'Hawk' },
  { zh: '鲨', en: 'Shark' },
  { zh: '熊', en: 'Bear' },
  { zh: '蝰', en: 'Viper' },
  { zh: '鹰', en: 'Raptor' },
  { zh: '虎', en: 'Tiger' },
  { zh: '蝎', en: 'Scorpion' },
  { zh: '鸦', en: 'Raven' },
  { zh: '獒', en: 'Mastiff' },
  { zh: '蟒', en: 'Python' },
  { zh: '雕', en: 'Condor' },
  { zh: '狞', en: 'Lynx' },
  { zh: '獾', en: 'Badger' },
];

/**
 * 生成随机军事代号
 * @returns 随机生成的代号，格式：影狼 · ShadowWolf
 */
export function generateRandomNickname(): string {
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const animal = animals[Math.floor(Math.random() * animals.length)];

  return `${prefix.zh}${animal.zh} · ${prefix.en}${animal.en}`;
}

/**
 * 生成唯一代号（确保不与已有代号重复）
 * @param existingNicknames 已存在的代号列表
 * @param maxAttempts 最大尝试次数
 * @returns 唯一的代号
 */
export function generateUniqueNickname(
  existingNicknames: string[],
  maxAttempts: number = 50
): string {
  for (let i = 0; i < maxAttempts; i++) {
    const nickname = generateRandomNickname();
    if (!existingNicknames.includes(nickname)) {
      return nickname;
    }
  }

  // 如果50次都重复，添加随机后缀确保唯一
  const baseNickname = generateRandomNickname();
  const suffix = Math.floor(Math.random() * 1000);
  return `${baseNickname} #${suffix}`;
}
