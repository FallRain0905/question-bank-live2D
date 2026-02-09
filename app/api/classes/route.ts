import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// GET - 获取用户加入的班级列表
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    // 获取用户加入的班级
    const { data: classes, error } = await supabase
      .from('class_members')
      .select(`
        class_id,
        role,
        classes (
          id,
          name,
          description,
          invite_code,
          creator_id,
          created_at
        )
      `)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json(classes?.map((c: any) => ({
      ...c.classes,
      userRole: c.role,
    })) || []);
  } catch (error: any) {
    console.error('获取班级列表失败:', error);
    return NextResponse.json({ error: '获取班级列表失败' }, { status: 500 });
  }
}

// POST - 创建新班级
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: '班级名称不能为空' }, { status: 400 });
    }

    // 创建班级
    const { data, error } = await supabase
      .from('classes')
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        creator_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('创建班级失败:', error);
    return NextResponse.json({ error: '创建班级失败' }, { status: 500 });
  }
}
