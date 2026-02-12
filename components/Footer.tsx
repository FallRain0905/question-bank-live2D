import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            © {new Date().getFullYear()} 学习共享 · 让学习资料管理变得简单高效
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span>禁止上传违法违规内容</span>
            <span>·</span>
            <Link href="/about" className="hover:text-gray-700">
              关于我们
            </Link>
            <span>·</span>
            <a href="mailto:3283254551@qq.com" className="hover:text-gray-700">
              联系管理员
            </a>
          </div>
        </div>
        <div className="mt-6 text-center text-xs text-gray-400">
          请遵守社区规范，文明发言。如有问题请联系：3283254551@qq.com
        </div>
      </div>
    </footer>
  );
}
