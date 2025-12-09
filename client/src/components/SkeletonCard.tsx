export default function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white rounded-2xl p-4 shadow">
      <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-16 bg-gray-100 rounded" />
        <div className="h-16 bg-gray-100 rounded" />
      </div>
      <div className="h-8 bg-gray-100 rounded mt-4" />
    </div>
  );
}
