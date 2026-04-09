export default function WorkbenchTestPage() {
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-green-800 mb-4">
          测试页面
        </h1>
        <p className="text-green-600">
          如果这个页面能加载，说明问题在 ai-workbench 路由
        </p>
      </div>
    </div>
  );
}