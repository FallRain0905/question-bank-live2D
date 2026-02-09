import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;

    // 使用 service_role 获取用户信息（需要管理员权限）
    const supabase = getSupabase();

    // 先尝试从公开的 user_profiles 表获取
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileData) {
      return NextResponse.json(profileData);
    }

    // 如果没有找到，尝试从 auth.users 获取（需要 admin 权限）
    // 注意：这需要设置 SUPABASE_SERVICE_ROLE_KEY 环境变量
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceKey) {
      const adminAuth = await supabase.auth.admin.getUserById(userId);
      if (adminAuth.data?.user) {
        const user = adminAuth.data.user;
        return NextResponse.json({
          id: user.id,
          email: user.email,
          username: user.user_metadata?.username || user.user_metadata?.display_name,
          created_at: user.created_at,
        });
      }
    }

    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return NextResponse.json({ error: '获取用户信息失败' }, { status: 500 });
  }
}
