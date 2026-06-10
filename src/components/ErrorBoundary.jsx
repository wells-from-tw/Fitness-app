import { Component } from 'react';

/**
 * Global crash guard.
 *
 * Without this, any uncaught render error (e.g. an unexpected shape of
 * data passed into a component — like the earlier "新增至午餐後畫面全黑"
 * bug) takes down the *entire* React tree to a blank/black screen with no
 * way to recover except force-quitting the PWA.
 *
 * This boundary catches such errors, shows a friendly recovery screen
 * (data in localStorage is untouched), and lets the user reload or go
 * back to the home tab instead of a silent black screen.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center bg-gray-50 dark:bg-[#0a0a0a]">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-lg font-semibold text-gray-700 dark:text-gray-200">糟糕，這個畫面發生錯誤</h1>
        <p className="text-sm text-gray-400 max-w-xs">
          別擔心，你的資料仍安全保存在裝置中。試試重新整理，或回到首頁。
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl text-sm font-semibold transition-colors active:scale-95"
          >
            重新整理
          </button>
          <button
            onClick={() => { window.location.href = '/'; }}
            className="px-5 py-2.5 bg-gray-100 dark:bg-[#1a1a1a] text-gray-600 dark:text-gray-300 rounded-2xl text-sm font-semibold transition-colors active:scale-95"
          >
            回到首頁
          </button>
        </div>
        {this.state.error && (
          <details className="text-xs text-gray-400 mt-2 max-w-full">
            <summary className="cursor-pointer">錯誤詳情（可截圖回報）</summary>
            <pre className="whitespace-pre-wrap text-left mt-2 p-2 bg-gray-100 dark:bg-[#1a1a1a] rounded-lg overflow-auto max-h-40">
              {String(this.state.error?.message || this.state.error)}
            </pre>
          </details>
        )}
      </div>
    );
  }
}
