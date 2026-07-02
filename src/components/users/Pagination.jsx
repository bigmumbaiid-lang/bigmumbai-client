const G  = '#3a7d44';
const GH = '#2e6437';

export default function Pagination({ currentPage, totalPages, totalUsers, pageSize, onPageChange }) {
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to   = Math.min(currentPage * pageSize, totalUsers);

  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-500">
        Showing <span className="font-semibold text-gray-700">{from}–{to}</span> of{' '}
        <span className="font-semibold text-gray-700">{totalUsers}</span> users
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-4 py-1.5 border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
        >
          ← Prev
        </button>
        <span
          className="px-4 py-1.5 text-xs font-semibold text-white"
          style={{ background: G }}
        >
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-4 py-1.5 border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
