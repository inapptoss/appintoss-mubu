export default function SoftWall({ onClose }: { onClose: ()=>void }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-24 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-card w-[92%] max-w-md rounded-2xl p-5 shadow mt-4">
        <div className="text-lg font-bold">
          지금까지 절약액 <span className="text-foreground">₩12,800</span>
        </div>
        <div className="text-sm text-gray-500 mt-1">
          로그인하면 기록 보관 / 광고 제거 체험(7일)
        </div>
        <div className="grid gap-2 mt-4">
          <button className="h-12 rounded-xl bg-black text-white">Apple로 계속</button>
          <button className="h-12 rounded-xl border">Google로 계속</button>
          <button className="h-12 rounded-xl border">Kakao로 계속</button>
        </div>
        <button className="mt-3 w-full text-gray-400 text-sm" onClick={onClose}>나중에</button>
      </div>
    </div>
  );
}
