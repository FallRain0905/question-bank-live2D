'use client';

import { useState, useEffect, useRef } from 'react';
import { getSupabase, getUserProfiles } from '@/lib/supabase';
import type { ClassWithRole } from '@/types';

interface ClassMember {
  id: string;
  user_id: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  username: string;
  display_name: string;
  avatar_url?: string;
  joined_at: string;
  message?: string;
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
  const [joinMessage, setJoinMessage] = useState('');

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
          status,
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
          userStatus: c.status,
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
      // 获取班级成员（包括待审核的）
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
            status: m.status,
            message: m.message,
            joined_at: m.joined_at,
            username: displayName,
            display_name: displayName,
            avatar_url: profile?.avatar_url,
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
    setJoinMessage('');

    if (!inviteCode.trim()) {
      setJoinError('请输入邀请码');
      return;
    }

    setJoining(true);
    try {
      const supabase = getSupabase();
      const { session } = await supabase.auth.getSession();

      // 先查找班级
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('id, name')
        .eq('invite_code', inviteCode.trim().toUpperCase())
        .maybeSingle();

      if (classError || !classData) {
        throw new Error('邀请码无效');
      }

      // 插入加入申请（状态为 pending）
      const { error: insertError } = await supabase
        .from('class_members')
        .insert({
          class_id: classData.id,
          user_id: user.id,
          role: 'member',
          status: 'pending',
          message: joinMessage.trim() || null,
        });

      if (insertError) throw insertError;

      setInviteCode('');
      setShowJoinModal(false);

      alert(`已提交加入 "${classData.name}" 的申请，等待班级管理员审核。`);
    } catch (error: any) {
      console.error('加入班级失败:', error);
      setJoinError(error.message || '加入失败，请重试');
    } finally {
      setJoining(false);
    }
  };

  const handleApproveMember = async (memberId: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('class_members')
        .update({ status: 'approved' })
        .eq('id', memberId);

      if (error) throw error;

      await loadMembers(selectedClass!.id);
      alert('已批准该成员加入');
    } catch (error: any) {
      console.error('批准成员失败:', error);
      alert('批准失败: ' + error.message);
    }
  };

  const handleRejectMember = async (memberId: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase
        .from('class_members')
        .update({ status: 'rejected' })
        .eq('id', memberId);

      if (error) throw error;

      await loadMembers(selectedClass!.id);
      alert('已拒绝该成员加入');
    } catch (error: any) {
      console.error('拒绝成员失败:', error);
      alert('拒绝失败: ' + error.message);
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

  const getUserAvatar = (member: ClassMember) => {
    if (member.avatar_url) {
      return (
        <img
          src={member.avatar_url}
          alt={member.username}
          className="w-10 h-10 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-brand-50 font-medium">
        {member.username?.[0]?.toUpperCase() || '?'}
      </div>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">待审核</span>;
      case 'approved':
        return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">已加入</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">已拒绝</span>;
      default:
        return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">{status}</span>;
    }
  };

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

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-brand-950">
        <div className="text-center">
          <p className="text-brand-400 mb-4">请先登录</p>
          <a href="/login" className="inline-block px-6 py-2 bg-brand-500 text-brand-50 rounded-lg hover:bg-brand-400">
            去登录
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-brand-950">
        <p className="text-brand-400">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-brand-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-brand-50">我的班级</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 bg-brand-800 text-brand-200 border border-brand-700 rounded-lg hover:border-brand-500 transition-colors"
            >
              加入班级
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-brand-500 text-brand-50 rounded-lg hover:bg-brand-400 transition-colors"
            >
              创建班级
            </button>
          </div>
        </div>

        {classes.length === 0 ? (
          <div className="bg-brand-800/50 border border-brand-700/50 rounded-xl p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-medium text-brand-100 mb-2">还没有加入任何班级</h2>
            <p className="text-brand-400 mb-6">创建班级或使用邀请码加入现有班级</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2 bg-brand-500 text-brand-50 rounded-lg hover:bg-brand-400"
              >
                创建班级
              </button>
              <button
                onClick={() => setShowJoinModal(true)}
                className="px-6 py-2 bg-brand-800 text-brand-200 border border-brand-700 rounded-lg hover:border-brand-500"
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
                className="bg-brand-800/50 border border-brand-700/50 rounded-xl p-6"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-brand-50 mb-1">{cls.name}</h3>
                    {cls.description && (
                      <p className="text-brand-400 mb-3">{cls.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-brand-500">
                      <span>邀请码: <code className="bg-brand-900 px-2 py-1 rounded text-brand-200">{cls.invite_code}</code></span>
                      <span>创建于 {new Date(cls.created_at).toLocaleDateString()}</span>
                      {cls.userRole && getRoleBadge(cls.userRole)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(cls.userRole === 'creator' || cls.userRole === 'moderator') && (
                      <button
                        onClick={() => openMembersModal(cls)}
                        className="px-4 py-2 bg-brand-700 text-brand-200 rounded-lg hover:bg-brand-600 transition-colors text-sm"
                      >
                        管理成员
                      </button>
                    )}
                    {cls.userRole !== 'creator' && (
                      <button
                        onClick={() => handleLeaveClass(cls.id, cls.name)}
                        className="px-4 py-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors text-sm"
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
        <div className="fixed inset-0 bg-brand-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-800 border border-brand-700 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-brand-50 mb-4">创建新班级</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-200 mb-2">
                  班级名称 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="例如：高等数学A班"
                  className="w-full px-4 py-2.5 bg-brand-900 border border-brand-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-brand-100 placeholder-brand-500"
                  disabled={creating}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-200 mb-2">
                  班级描述
                </label>
                <textarea
                  value={classDesc}
                  onChange={(e) => setClassDesc(e.target.value)}
                  placeholder="简单描述一下这个班级..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-brand-900 border border-brand-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none text-brand-100 placeholder-brand-500"
                  disabled={creating}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-brand-400 hover:bg-brand-700 rounded-lg transition-colors"
                disabled={creating}
              >
                取消
              </button>
              <button
                onClick={handleCreateClass}
                className="px-4 py-2 bg-brand-500 text-brand-50 rounded-lg hover:bg-brand-400 transition-colors disabled:bg-brand-800 disabled:text-brand-500"
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
        <div className="fixed inset-0 bg-brand-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-800 border border-brand-700 rounded-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-brand-50 mb-4">加入班级</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-brand-200 mb-2">
                  邀请码 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="输入8位邀请码"
                  className="w-full px-4 py-2.5 bg-brand-900 border border-brand-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none text-brand-100 placeholder-brand-500 uppercase"
                  disabled={joining}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-brand-200 mb-2">
                  申请说明（可选）
                </label>
                <textarea
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="告诉管理员一些关于你的信息..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-brand-900 border border-brand-700 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none text-brand-100 placeholder-brand-500"
                  disabled={joining}
                />
              </div>
              {joinError && (
                <p className="text-sm text-red-400">{joinError}</p>
              )}
              <div className="bg-brand-700/30 border border-brand-700/50 rounded-lg p-3">
                <p className="text-sm text-brand-300">
                  ⚠️ 提交申请后，需要等待班级管理员审核批准后才能加入班级。
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinError('');
                }}
                className="px-4 py-2 text-brand-400 hover:bg-brand-700 rounded-lg transition-colors"
                disabled={joining}
              >
                取消
              </button>
              <button
                onClick={handleJoinClass}
                className="px-4 py-2 bg-brand-500 text-brand-50 rounded-lg hover:bg-brand-400 transition-colors disabled:bg-brand-800 disabled:text-brand-500"
                disabled={joining}
              >
                {joining ? '提交申请...' : '提交申请'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 成员管理弹窗 */}
      {showMembersModal && selectedClass && (
        <div className="fixed inset-0 bg-brand-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-brand-800 border border-brand-700 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-brand-700">
              <h2 className="text-xl font-bold text-brand-50">{selectedClass.name} - 成员管理</h2>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-brand-500 hover:text-brand-400 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4 border-b border-brand-700">
              <p className="text-sm text-brand-400">邀请码: <code className="bg-brand-900 px-2 py-1 rounded text-brand-200">{selectedClass.invite_code}</code></p>
            </div>
            {loadingMembers ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-brand-400">加载中...</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4">
                {members.length === 0 ? (
                  <p className="text-center text-brand-500 py-8">暂无成员</p>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-brand-900/50 border border-brand-700/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getUserAvatar(member)}
                          <div>
                            <p className="font-medium text-brand-100">{member.username}</p>
                            <div className="flex items-center gap-2 text-xs text-brand-500">
                              <span>加入于 {new Date(member.joined_at).toLocaleDateString()}</span>
                              {getStatusBadge(member.status)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getRoleBadge(member.role)}
                          {member.message && (
                            <button
                              onClick={() => alert(`申请说明: ${member.message}`)}
                              className="text-brand-500 hover:text-brand-400 text-xs"
                              title="查看申请说明"
                            >
                              💬
                            </button>
                          )}
                          {member.status === 'pending' && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleApproveMember(member.id)}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                批准
                              </button>
                              <button
                                onClick={() => handleRejectMember(member.id)}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                拒绝
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => handleRemoveMember(member.id, member.username)}
                            className="text-red-400 hover:text-red-300 p-2 hover:bg-red-900/30 rounded-lg transition-colors"
                            title="移除成员"
                          >
                            🗑️
                          </button>
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
