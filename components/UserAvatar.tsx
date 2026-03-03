'use client';

import Link from 'next/link';

interface UserAvatarProps {
  userId?: string;
  username?: string;
  avatarUrl?: string | null;
  email?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  showEmail?: boolean;
  subtitle?: string;
  className?: string;
}

export function UserAvatar({
  userId,
  username,
  avatarUrl,
  email,
  size = 'md',
  showName = true,
  showEmail = false,
  subtitle,
  className = '',
}: UserAvatarProps) {
  const displayName = username || '用户';
  const avatarSize = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
  };
  const textSize = {
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  };

  const AvatarComponent = ({ asLink = true }: { asLink?: boolean }) => {
    const content = (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* 头像 */}
        <div
          className={`${avatarSize[size]} rounded-full flex items-center justify-center font-medium transition-transform hover:scale-105 ${
            avatarUrl
              ? 'overflow-hidden'
              : 'bg-gradient-to-br from-brand-500 to-brand-600 text-brand-50 shadow-lg shadow-brand-500/20'
          }`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span>{displayName[0]?.toUpperCase() || '?'}</span>
          )}
        </div>

        {/* 用户信息 */}
        {showName && (
          <div className="flex flex-col">
            <div className={`flex items-center gap-2 ${textSize[size]}`}>
              <span className="font-semibold text-brand-100">{displayName}</span>
            </div>
            {showEmail && email && (
              <span className="text-xs text-brand-400">{email}</span>
            )}
            {subtitle && (
              <span className="text-xs text-brand-400">{subtitle}</span>
            )}
          </div>
        )}
      </div>
    );

    return asLink && userId ? (
      <Link href={`/users/${userId}`} className="block transition-transform hover:scale-[1.02]">
        {content}
      </Link>
    ) : (
      <div>{content}</div>
    );
  };

  return <AvatarComponent />;
}

// 简洁的用户标签（用于评论区）
export function UserTag({
  username,
  avatarUrl,
  email,
  className = '',
}: {
  username?: string;
  avatarUrl?: string | null;
  email?: string;
  className?: string;
}) {
  const displayName = username || '用户';

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-brand-800/50"
          />
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-600 rounded-full flex items-center justify-center text-brand-50 text-xs font-medium ring-2 ring-brand-800/50">
            {displayName[0]?.toUpperCase() || '?'}
          </div>
        )}
        <span className="font-medium text-brand-100">{displayName}</span>
      </div>
    </div>
  );
}
