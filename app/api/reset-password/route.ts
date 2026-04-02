import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// 创建 Supabase 客户端
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    // 验证邮箱格式
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: '请输入有效的邮箱地址' },
        { status: 400 }
      );
    }

    // 发送密码重置邮件
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      console.error('发送密码重置邮件失败:', error);

      // 为了安全性，不返回具体的错误信息
      return NextResponse.json(
        { success: false, error: '发送密码重置邮件失败，请检查邮箱地址是否正确' },
        { status: 400 }
      );
    }

    console.log('密码重置邮件已发送到:', email);

    return NextResponse.json({
      success: true,
      message: '密码重置邮件已发送，请检查您的邮箱'
    });

  } catch (error: any) {
    console.error('密码重置 API 错误:', error);
    return NextResponse.json(
      { success: false, error: '服务器错误，请稍后重试' },
      { status: 500 }
    );
  }
}