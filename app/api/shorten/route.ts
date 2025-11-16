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

    // 调用短链接服务
    const response = await fetch('https://www.dwz.net/api/url/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        apikey: process.env.DWZ_API_KEY || 'ooXju9ZuDqzurMJHXK9N',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('短链接生成失败:', data);
      return NextResponse.json(
        { error: '短链接生成失败', details: data },
        { status: response.status }
      );
    }

    // 返回短链接
    return NextResponse.json({
      success: true,
      shortUrl: data.ShortUrl || data.shortUrl || data.url,
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
