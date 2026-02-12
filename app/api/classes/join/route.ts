import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

// POST - 通过邀请码加入班级
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient();

    // 从请求头获取用户信息（用于服务端 API）
    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    let user = null;
    if (token) {
      // 验证 token 并获取用户信息
      const { data: { user: authUser }, error } = await supabase.auth.getUser(token);
      if (!error && authUser) {
        user = authUser;
      }
    }

    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 创建一个带认证上下文的客户端用于 RLS 操作
    const { createClient } = await import('@supabase/supabase-js');
    const authSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const body = await request.json();
    const { inviteCode } = body;

    if (!inviteCode?.trim()) {
      return NextResponse.json({ error: '邀请码不能为空' }, { status: 400 });
    }

    // 查找班级
    const { data: classData, error: classError } = await authSupabase
      .from('classes')
      .select('*')
      .eq('invite_code', inviteCode.trim().toUpperCase())
      .single();

    if (classError || !classData) {
      return NextResponse.json({ error: '邀请码无效' }, { status: 404 });
    }

    // 检查是否已经是班级成员
    const { data: existingMember } = await authSupabase
      .from('class_members')
      .select('*')
      .eq('class_id', classData.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({ error: '你已经是该班级成员' }, { status: 400 });
    }

    // 加入班级
    const { error: joinError } = await authSupabase
      .from('class_members')
      .insert({
        class_id: classData.id,
        user_id: user.id,
        role: 'member',
      });

    if (joinError) throw joinError;

    return NextResponse.json({
      success: true,
      class: {
        id: classData.id,
        name: classData.name,
        description: classData.description,
      }
    });
  } catch (error: any) {
    console.error('加入班级失败:', error);
    return NextResponse.json({ error: '加入班级失败' }, { status: 500 });
  }
}
