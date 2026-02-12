'use client';

import { useState, useEffect, useRef } from 'react';
import { getSupabase, getUserProfiles } from '@/lib/supabase';
import type { ClassWithRole } from '@/types';

interface ClassMember {
  id: string;
  user_id: string;
  role: string;
  username: string;
  display_name: string;
  joined_at: string;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // 使用 ref 防止组件卸载后更新状态
  const isMounted = useRef(true);

  // 创建班级表单
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [className, setClassName] = useState('');
  const [classDesc, setClassDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // 加入班级表单
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  // 成员管理
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassWithRole | null>(null);
  const [members, setMembers] = useState<ClassMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    isMounted.current = true;
    checkUser();

    return () => {
      isMounted.current = false;
    };
  }, []);

  // 只有当 user 存在时才加载班级列表
  useEffect(() => {
    if (user) {
      loadClasses();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (isMounted.current) {
      setUser(user);
      if (!user) {
        setLoading(false);
      }
    }
  };

  const loadClasses = async () => {
    setLoading(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
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

      if (error) {
        console.error('获取班级列表失败:', error);
        setClasses([]);
      } else {
        setClasses(data?.map((c: any) => ({
          ...c.classes,
          userRole: c.role,
        })) || []);
      }
    } catch (err) {
      console.error('加载班级时出错:', err);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (classId: string) => {
    setLoadingMembers(true);
    try {
      const supabase = getSupabase();
      // 获取班级成员
      const { data: members, error } = await supabase
        .from('class_members')
        .select('*')
        .eq('class_id', classId)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('获取成员列表失败:', error);
        setMembers([]);
        return;
      }

      if (!members || members.length === 0) {
        setMembers([]);
        return;
      }

      // 获取所有用户 ID
      const userIds = members.map(m => m.user_id);

      // 使用工具函数批量获取用户信息
      const profileMap = await getUserProfiles(userIds);

      if (isMounted.current) {
        setMembers(members.map((m: any) => {
          const profile = profileMap.get(m.user_id);
          const displayName = profile?.username || profile?.display_name || '用户';
          return {
            id: m.id,
            user_id: m.user_id,
            role: m.role,
            joined_at: m.joined_at,
            username: displayName,
            display_name: displayName,
          };
        }));
      }
    } catch (err) {
      console.error('加载成员时出错:', err);
      if (isMounted.current) {
        setMembers([]);
      }
    } finally {
      if (isMounted.current) {
        setLoadingMembers(false);
      }
    }
  };

  const handleCreateClass = async () => {
    if (!className.trim()) {
      alert('请输入班级名称');
      return;
    }

    setCreating(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('classes')
        .insert({
          name: className.trim(),
          description: classDesc.trim() || null,
          creator_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setClassName('');
      setClassDesc('');
      setShowCreateModal(false);

      await loadClasses();

      alert(`班级 "${data.name}" 创建成功！\n邀请码: ${data.invite_code}`);
    } catch (error: any) {
      console.error('创建班级失败:', error);
      alert('创建失败: ' + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinClass = async () => {
    setJoinError('');
    if (!inviteCode.trim()) {
      setJoinError('请输入邀请码');
      return;
    }

    setJoining(true);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/classes/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ inviteCode: inviteCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '加入失败');
      }

      setInviteCode('');
      setShowJoinModal(false);

      await loadClasses();

      alert(`成功加入班级 "${data.class.name}"！`);
    } catch (error: any) {
      console.error('加入班级失败:', error);
      setJoinError(error.message);
    } finally {
      setJoining(false);
    }
  };

  const handleLeaveClass = async (classId: string, className: string) => {
    if (!confirm(`确定要退出班级 "${className}" 吗？`)) return;

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch('/api/classes/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.user && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ classId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '退出失败');
      }

      await loadClasses();

      alert('已退出班级');
    } catch (error: any) {
      console.error('退出班级失败:', error);
      alert('退出失败: ' + error.message);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!confirm(`确定要将 "${memberName}" 移出班级吗？`)) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('class_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      // 重新加载成员列表
      await loadMembers(selectedClass!.id);
      alert('已移除成员');
    } catch (error: any) {
      console.error('移除成员失败:', error);
      alert('移除失败: ' + error.message);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string, memberName: string) => {
    const roleText = newRole === 'moderator' ? '审核员' : '普通成员';
    if (!confirm(`确定要将 "${memberName}" 设为 ${roleText} 吗？`)) return;

    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('class_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) throw error;

      // 重新加载成员列表
      await loadMembers(selectedClass!.id);
      alert(`已将 ${memberName} 设为 ${roleText}`);
    } catch (error: any) {
      console.error('更改角色失败:', error);
      alert('更改失败: ' + error.message);
    }
  };

  const openMembersModal = async (cls: ClassWithRole) => {
    setSelectedClass(cls);
    setShowMembersModal(true);
    await loadMembers(cls.id);
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">请先登录</p>
          <a href="/login" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            去登录
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'creator':
        return <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">创建者</span>;
      case 'moderator':
        return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">审核员</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">成员</span>;
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">我的班级</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors"
            >
              加入班级
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              创建班级
            </button>
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">还没有加入任何班级</h2>
            <p className="text-gray-500 mb-6">创建班级或使用邀请码加入现有班级</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                创建班级
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:border-blue-500"
              >
                加入班级
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {classes.map((cls) => (
              <div
                key={cls.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{cls.name}</h3>
                    {cls.description && (
                      <p className="text-gray-600 mb-3">{cls.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>邀请码: <code className="bg-gray-100 px-2 py-1 rounded">{cls.invite_code}</code></span>
                      {cls.userRole && getRoleBadge(cls.userRole)}
                      <span>创建于 {new Date(cls.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {cls.userRole === 'creator' && (
                      <button
                        onClick={() => openMembersModal(cls)}
                        className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        管理成员
                      </button>
                    )}
                    {cls.userRole !== 'creator' && (
                      <button
                        onClick={() => handleLeaveClass(cls.id, cls.name)}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        退出班级
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 创建班级弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">创建新班级</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  班级名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="例如：高等数学A班"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  disabled={creating}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  班级描述
                </label>
                <textarea
                  value={classDesc}
                  onChange={(e) => setClassDesc(e.target.value)}
                  placeholder="简单描述一下这个班级..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                  disabled={creating}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={creating}
              >
                取消
              </button>
              <button
                onClick={handleCreateClass}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                disabled={creating}
              >
                {creating ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 加入班级弹窗 */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">加入班级</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                邀请码 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="输入8位邀请码"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
                disabled={joining}
              />
              {joinError && (
                <p className="mt-1 text-sm text-red-600">{joinError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinError('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={joining}
              >
                取消
              </button>
              <button
                onClick={handleJoinClass}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                disabled={joining}
              >
                {joining ? '加入中...' : '加入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 成员管理弹窗 */}
      {showMembersModal && selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full p-6 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">{selectedClass.name} - 成员管理</h2>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">邀请码: <code className="bg-gray-100 px-2 py-1 rounded">{selectedClass.invite_code}</code></p>

            {loadingMembers ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500">加载中...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {members.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">暂无成员</p>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium">
                            {member.username?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{member.username}</p>
                            <p className="text-xs text-gray-500">
                              加入于 {new Date(member.joined_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getRoleBadge(member.role)}
                          {member.role !== 'creator' && (
                            <div className="flex gap-1">
                              {member.role === 'member' ? (
                                <button
                                  onClick={() => handleChangeRole(member.id, 'moderator', member.username)}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                                >
                                  设为审核员
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleChangeRole(member.id, 'member', member.username)}
                                  className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
                                >
                                  设为成员
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveMember(member.id, member.username)}
                                className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                              >
                                移除
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
