import { Suspense } from 'react';
import ResetPasswordForm from './reset-password-form';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">加载中...</p>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}