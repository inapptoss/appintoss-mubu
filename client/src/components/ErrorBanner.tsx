export default function ErrorBanner({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl p-3 text-sm flex items-center justify-between">
      <span>잠시 문제가 발생했어요. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.</span>
      <button onClick={onRetry} className="ml-2 px-3 py-1 rounded bg-yellow-200">재시도</button>
    </div>
  );
}
