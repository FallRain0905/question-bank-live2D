import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="zh-CN">
      <Head>
        <meta charSet="utf-8" />
        <title>题库系统</title>
        <meta name="description" content="共享题库，支持文本和图片上传" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />

        {/* Live2D Cubism 4 Runtime - 真实 Live2D 渲染所需 */}
        <script
          src="/live2d/runtime/cubism4.min.js"
          async
        />
      </Head>
      <body className="bg-brand-50 text-brand-900">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
