/**
 * 短链接生成 API
 *
 * POST /api/shorten
 * 调用 dwz.net 短链接服务
 */

import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: '缺少 URL 参数' },
        { status: 400 }
      );
    }

    // 检查环境变量是否配置
    const apiKey = process.env.DWZ_API_KEY;
    if (!apiKey) {
      console.error('DWZ_API_KEY 环境变量未配置');
      return NextResponse.json(
        { error: '短链接服务未配置' },
        { status: 500 }
      );
    }

    // 调用短链接服务
    const response = await fetch('https://www.dwz.net/api/url/add', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    // 检查 API 返回结果
    if (!response.ok || data.error !== 0) {
      console.error('短链接生成失败:', data);
      return NextResponse.json(
        { error: '短链接生成失败', details: data },
        { status: response.status }
      );
    }

    // dwz.net 返回格式: {"error":0,"short":"http://c3z.cn/xxxxx"}
    const shortUrl = data.short;

    if (!shortUrl) {
      console.error('短链接字段缺失:', data);
      return NextResponse.json(
        { error: '短链接生成失败' },
        { status: 500 }
      );
    }

    console.log('✅ 短链接生成成功:', shortUrl);

    // 返回短链接
    return NextResponse.json({
      success: true,
      shortUrl,
      original: url,
    });
  } catch (error) {
    console.error('短链接 API 错误:', error);
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    );
  }
}
