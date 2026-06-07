/** Generic preview modal shown before saving/sharing a generated card image. */
export default function SharePreviewModal({ dataUrl, filename, title, onClose }) {
  async function handleConfirmShare() {
    try {
      const res  = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        a.click();
      }
      onClose();
    } catch (e) {
      if (e.name !== 'AbortError') console.error(e);
    }
  }

  function handleSave() {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#111] rounded-2xl border border-gray-100 dark:border-[#1e1e1e] w-full max-w-sm max-h-[90vh] overflow-y-auto p-4 flex flex-col gap-3"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">預覽</h3>
        <img src={dataUrl} alt="分享卡片預覽" className="w-full rounded-xl border border-gray-100 dark:border-[#1e1e1e]" />
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 bg-gray-100 dark:bg-[#1a1a1a] dark:text-gray-300"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-[#1a1a1a]"
          >
            💾 儲存
          </button>
          <button
            onClick={handleConfirmShare}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-gray-900 dark:bg-white dark:text-gray-900"
          >
            📤 分享
          </button>
        </div>
      </div>
    </div>
  );
}
