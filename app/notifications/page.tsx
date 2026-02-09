'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Notification } from '@/types';

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { user } } = await getSupabase().auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    setUser(user);
  };

  const loadNotifications = async () => {
    if (!user) return;

    const supabase = getSupabase();
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }

    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    const supabase = getSupabase();
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    const supabase = getSupabase();

    const unreadIds = notifications
      .filter(n => !n.is_read)
      .map(n => n.id);

    if (unreadIds.length > 0) {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      setNotifications(prev =>
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const supabase = getSupabase();
    await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (!notifications.find(n => n.id === notificationId)?.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  if (!user) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">消息通知</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-1 text-sm font-medium bg-red-500 text-white rounded-full">
                {unreadCount} 条未读
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              全部已读
            </button>
          )}
        </div>

        {/* 通知列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">还没有通知消息</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={() => markAsRead(notification.id)}
                onDelete={() => deleteNotification(notification.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
  onDelete
}: {
  notification: Notification;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'comment': return '💬';
      case 'reply': return '↩️';
      case 'like': return '❤️';
      case 'follow': return '👤';
      case 'approve': return '✅';
      default: return '🔔';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'comment': return '新评论';
      case 'reply': return '新回复';
      case 'like': return '收到点赞';
      case 'follow': return '新粉丝';
      case 'approve': return '审核通过';
      default: return '通知';
    }
  };

  const content = notification.link ? (
    <Link
      href={notification.link}
      onClick={onMarkRead}
      className="flex-1"
    >
      <NotificationContent
        notification={notification}
        getIcon={getIcon}
        getTypeLabel={getTypeLabel}
      />
    </Link>
  ) : (
    <div className="flex-1" onClick={onMarkRead}>
      <NotificationContent
        notification={notification}
        getIcon={getIcon}
        getTypeLabel={getTypeLabel}
      />
    </div>
  );

  return (
    <div className={`bg-white rounded-xl shadow-sm border ${
      !notification.is_read ? 'border-blue-200 bg-blue-50/50' : 'border-gray-200'
    } p-5 transition`}>
      <div className="flex items-start gap-4">
        {/* 图标 */}
        <div className="text-2xl">{getIcon(notification.type)}</div>

        {content}

        {/* 操作 */}
        <div className="flex items-center gap-2">
          {!notification.is_read && (
            <button
              onClick={onMarkRead}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              标记已读
            </button>
          )}
          <button
            onClick={onDelete}
            className="text-gray-400 hover:text-red-600 transition"
          >
            删除
          </button>
        </div>
      </div>

      {/* 时间 */}
      <p className="text-xs text-gray-500 mt-3 ml-10">
        {formatDistanceToNow(new Date(notification.created_at), { locale: zhCN, addSuffix: true })}
      </p>
    </div>
  );
}

function NotificationContent({
  notification,
  getIcon,
  getTypeLabel
}: {
  notification: Notification;
  getIcon: (type: string) => string;
  getTypeLabel: (type: string) => string;
}) {
  return (
    <>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-medium ${
            !notification.is_read ? 'text-gray-900' : 'text-gray-600'
          }`}>
            {getTypeLabel(notification.type)}
          </span>
          {!notification.is_read && (
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
          )}
        </div>
        <h3 className={`font-medium mb-1 ${
          !notification.is_read ? 'text-gray-900' : 'text-gray-600'
        }`}>
          {notification.title}
        </h3>
        {notification.content && (
          <p className="text-sm text-gray-600">{notification.content}</p>
        )}
      </div>
    </>
  );
}
