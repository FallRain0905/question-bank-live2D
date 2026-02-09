import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

// POST - 退出班级
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await request.json();
    const { classId } = body;

    if (!classId) {
      return NextResponse.json({ error: '班级ID不能为空' }, { status: 400 });
    }

    // 检查是否是班级创建者
    const { data: classData } = await supabase
      .from('classes')
      .select('creator_id')
      .eq('id', classId)
      .single();

    if (classData?.creator_id === user.id) {
      return NextResponse.json({ error: '班级创建者不能退出班级' }, { status: 400 });
    }

    // 退出班级
    const { error } = await supabase
      .from('class_members')
      .delete()
      .eq('class_id', classId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('退出班级失败:', error);
    return NextResponse.json({ error: '退出班级失败' }, { status: 500 });
  }
}
