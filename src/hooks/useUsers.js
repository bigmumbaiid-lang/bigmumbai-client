import { useCallback, useEffect, useState } from 'react';
import { usersApi } from '../api/users';
import { useDebounce } from './useDebounce';
import { USERS_PAGE_SIZE } from '../constants/users';

// Owns everything about the users list: fetching, pagination, debounced search,
// and patching a single row in place so we don't refetch after small mutations.
export function useUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  const fetchUsers = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);
        const data = await usersApi.list({
          page,
          limit: USERS_PAGE_SIZE,
          search: debouncedSearch,
        });
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
        setTotalUsers(data.totalUsers || 0);
        setCurrentPage(page);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch]
  );

  // Reload from page 1 whenever the (debounced) search term changes,
  // and once on mount.
  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const goToPage = useCallback(
    (page) => {
      if (page < 1 || page > totalPages) return;
      fetchUsers(page);
    },
    [fetchUsers, totalPages]
  );

  // Apply `changes` to a single user without a network round-trip.
  const updateUser = useCallback((userId, changes) => {
    setUsers((prev) =>
      prev.map((u) => (u._id === userId ? { ...u, ...changes } : u))
    );
  }, []);

  return {
    users,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    currentPage,
    totalPages,
    totalUsers,
    pageSize: USERS_PAGE_SIZE,
    fetchUsers,
    goToPage,
    updateUser,
  };
}
