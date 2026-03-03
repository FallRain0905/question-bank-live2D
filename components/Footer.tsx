import Link from 'next/link';

interface FooterProps {
  className?: string;
}

export default function Footer({ className = '' }: FooterProps) {
  return (
    <footer className={`bg-brand-900/50 border-t border-brand-800 py-8 ${className}`}>
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-brand-500">
            © {new Date().getFullYear()} 学习共享 · 让学习资料管理变得简单高效
          </div>
          <div className="flex items-center gap-4 text-sm text-brand-500">
            <span>禁止上传违法违规内容</span>
            <span>·</span>
            <Link href="/about" className="hover:text-brand-300">
              关于我们
            </Link>
            <span>·</span>
            <a href="mailto:3283254551@qq.com" className="hover:text-brand-300">
              联系管理员
            </a>
          </div>
        </div>
        <div className="mt-6 text-center text-xs text-brand-600">
          请遵守社区规范，文明发言。如有问题请联系：3283254551@qq.com
        </div>
      </div>
    </footer>
  );
}
