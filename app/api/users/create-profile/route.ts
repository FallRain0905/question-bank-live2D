import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { userId, username, displayName, accessToken } = await request.json();

    if (!userId || !username) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 使用服务端客户端
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 如果提供了 access token，使用它来认证
    const supabaseClient = accessToken
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          }
        )
      : supabase;

    // 先检查是否已存在用户资料
    const { data: existingProfile } = await supabaseClient
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingProfile) {
      // 资料已存在，不需要创建
      return NextResponse.json({ success: true, message: '用户资料已存在' });
    }

    // 创建用户资料
    const { error } = await supabaseClient
      .from('user_profiles')
      .insert({
        id: userId,
        username: username.trim(),
        display_name: displayName || username.trim(),
      });

    if (error) {
      console.error('创建用户资料失败:', error);
      return NextResponse.json(
        { error: '创建用户资料失败: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API 错误:', error);
    return NextResponse.json(
      { error: '服务器错误: ' + (error?.message || '未知错误') },
      { status: 500 }
    );
  }
}
