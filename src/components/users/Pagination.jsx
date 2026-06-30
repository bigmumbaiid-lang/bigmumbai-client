export default function Pagination({ currentPage, totalPages, totalUsers, pageSize, onPageChange }) {
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalUsers);

  return (
    <div className="flex items-center justify-between px-8 py-5 border-t">
      <div className="text-sm text-gray-600">
        Showing {from} to {to} of {totalUsers} users
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-5 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition"
        >
          Previous
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-5 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition"
        >
          Next
        </button>
      </div>
    </div>
  );
}
