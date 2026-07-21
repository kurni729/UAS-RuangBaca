import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage, requestWithRetry, getCoverUrl, BACKEND_BASE_URL } from '../services/api';
import toast from 'react-hot-toast';

interface Book {
  id: number;
  title: string;
  author: string;
  cover_image: string | null;
  file_url: string | null;
  rak: string | null;
}

interface Loan {
  id: number;
  borrow_date: string;
  return_date: string | null;
  status: string;
  nim: string;
  title: string;
  author: string;
  cover_image: string | null;
  rak: string | null;
}

interface User {
  id: number;
  nim: string;
  role: string;
  created_at: string;
}

interface ApiListResponse<T> {
  data: T[];
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'books' | 'loans' | 'users'>('overview');
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isConfirming, setIsConfirming] = useState<number | null>(null);
  const [isReturning, setIsReturning] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [loansError, setLoansError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [rak, setRak] = useState('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [bookFile, setBookFile] = useState<File | null>(null);

  // User form state
  const [userNim, setUserNim] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');
  const [userPin, setUserPin] = useState('');

  // Get user info from localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const fetchData = useCallback(async ({ showLoader = true }: { showLoader?: boolean } = {}) => {
    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    const [booksResult, loansResult, usersResult] = await Promise.allSettled([
      requestWithRetry(() => api.get<ApiListResponse<Book>>('/books')),
      requestWithRetry(() => api.get<ApiListResponse<Loan>>('/loans')),
      requestWithRetry(() => api.get<ApiListResponse<User>>('/auth/users')),
    ]);

    const nextBooksError =
      booksResult.status === 'rejected'
        ? getApiErrorMessage(booksResult.reason, 'Data buku gagal dimuat.')
        : null;
    const nextLoansError =
      loansResult.status === 'rejected'
        ? getApiErrorMessage(loansResult.reason, 'Data peminjaman gagal dimuat.')
        : null;
    const nextUsersError =
      usersResult.status === 'rejected'
        ? getApiErrorMessage(usersResult.reason, 'Data pengguna gagal dimuat.')
        : null;

    if (booksResult.status === 'fulfilled') {
      setBooks(booksResult.value.data.data);
    } else if (showLoader) {
      setBooks([]);
    }

    if (loansResult.status === 'fulfilled') {
      setLoans(loansResult.value.data.data);
    } else if (showLoader) {
      setLoans([]);
    }

    if (usersResult.status === 'fulfilled') {
      setUsers(usersResult.value.data.data);
    } else if (showLoader) {
      setUsers([]);
    }

    setBooksError(nextBooksError);
    setLoansError(nextLoansError);
    setUsersError(nextUsersError);

    const nextNotice = [
      nextBooksError && `Buku: ${nextBooksError}`,
      nextLoansError && `Peminjaman: ${nextLoansError}`,
      nextUsersError && `Pengguna: ${nextUsersError}`,
    ]
      .filter(Boolean)
      .join(' ');

    setPageNotice(nextNotice || null);

    if (nextNotice) {
      console.error('Gagal mengambil data dashboard admin:', {
        books: nextBooksError,
        loans: nextLoansError,
        users: nextUsersError,
      });
      toast.error(nextNotice);
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    try {
      const res = await requestWithRetry(() =>
        api.get<ApiListResponse<Book>>(`/books?search=${encodeURIComponent(query)}`)
      );
      setBooks(res.data.data);
      setBooksError(null);
    } catch (error) {
      const message = getApiErrorMessage(error, 'Pencarian buku gagal.');
      console.error('Gagal mencari buku:', error);
      setBooksError(message);
      toast.error(message);
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate('/');
      toast.success('Logout berhasil');
    }
  };

  const handleSubmitBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('author', author);
    if (rak) formData.append('rak', rak);
    if (coverImage) formData.append('cover', coverImage);
    if (bookFile) formData.append('file', bookFile);

    try {
      await api.post('/books', formData);
      toast.success('Buku berhasil ditambahkan!');
      setIsModalOpen(false);
      resetForm();
      void fetchData({ showLoader: false });
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Gagal mengunggah buku.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);

    if (!editingBook) return;

    const formData = new FormData();
    formData.append('title', title || editingBook.title);
    formData.append('author', author || editingBook.author);
    if (rak) formData.append('rak', rak);
    if (coverImage) formData.append('cover', coverImage);
    if (bookFile) formData.append('file', bookFile);

    try {
      await api.put(`/books/${editingBook.id}`, formData);
      toast.success('Buku berhasil diperbarui!');
      setIsEditModalOpen(false);
      resetForm();
      void fetchData({ showLoader: false });
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.response?.data?.message || 'Gagal memperbarui buku.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteBook = async (bookId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus buku ini?')) return;
    setIsDeleting(bookId);
    try {
      await api.delete(`/books/${bookId}`);
      toast.success('Buku berhasil dihapus!');
      void fetchData({ showLoader: false });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menghapus buku');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleOpenEditModal = (book: Book) => {
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setRak(book.rak || '');
    setCoverImage(null);
    setBookFile(null);
    setIsEditModalOpen(true);
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', { nim: userNim, password: userPassword, role: userRole, pin: userRole === 'admin' ? userPin : undefined });
      toast.success('Pengguna berhasil ditambahkan!');
      setIsUserModalOpen(false);
      setUserNim('');
      setUserPassword('');
      setUserRole('user');
      setUserPin('');
      void fetchData({ showLoader: false });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menambahkan pengguna');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini?')) return;
    try {
      await api.delete(`/auth/users/${userId}`);
      toast.success('Pengguna berhasil dihapus!');
      void fetchData({ showLoader: false });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal menghapus pengguna');
    }
  };

  const handleConfirmLoan = async (loanId: number) => {
    setIsConfirming(loanId);
    try {
      await api.put(`/loans/${loanId}/confirm`);
      toast.success('Peminjaman berhasil dikonfirmasi!');
      void fetchData({ showLoader: false });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal mengkonfirmasi peminjaman');
    } finally {
      setIsConfirming(null);
    }
  };

  const handleConfirmReturn = async (loanId: number) => {
    setIsReturning(loanId);
    try {
      await api.put(`/loans/${loanId}/return`);
      toast.success('Pengembalian berhasil dikonfirmasi!');
      void fetchData({ showLoader: false });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal mengkonfirmasi pengembalian');
    } finally {
      setIsReturning(null);
    }
  };

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setRak('');
    setCoverImage(null);
    setBookFile(null);
    setEditingBook(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'dipinjam':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'dikembalikan':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Menunggu Konfirmasi';
      case 'dipinjam':
        return 'Dipinjam';
      case 'dikembalikan':
        return 'Dikembalikan';
      default:
        return status;
    }
  };

  const stats = {
    totalBooks: books.length,
    totalLoans: loans.length,
    activeLoans: loans.filter(l => l.status === 'dipinjam').length,
    returnedLoans: loans.filter(l => l.status === 'dikembalikan').length,
    pendingLoans: loans.filter(l => l.status === 'pending').length,
  };

  const activeError =
    activeTab === 'books'
      ? booksError
      : activeTab === 'loans' || activeTab === 'overview'
        ? loansError
        : usersError;

  return (
    <div className="bg-[#f9f9ff] text-[#111c2d] min-h-screen flex flex-col font-sans relative">
      {/* TopNavBar */}
      <header className="hidden md:flex fixed top-0 w-full z-40 bg-white/70 backdrop-blur-xl border-b border-slate-200 shadow-sm justify-between items-center px-6 h-16 max-w-[1280px] mx-auto">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-blue-600">RuangBaca</span>
        </div>
        <div className="flex-1 flex justify-center max-w-md mx-8">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">search</span>
            <input
              type="text"
              placeholder="Cari buku..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-200 text-sm text-slate-900 transition-all"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-right">
            <div>
              <p className="text-sm font-semibold text-slate-900">{user?.nim || 'Admin'}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role || 'admin'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 overflow-hidden ml-2 border border-slate-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600">admin_panel_settings</span>
            </div>
          </div>
        </div>
      </header>

      {/* SideNavBar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[280px] z-30 bg-white/80 backdrop-blur-md border-r border-slate-200 shadow-md flex-col p-6 space-y-2 pt-24">
        <div className="flex flex-col items-center mb-8 pb-6 border-b border-slate-200 text-center">
          <div className="w-16 h-16 rounded-lg bg-blue-50 mb-3 flex items-center justify-center border border-slate-200">
            <span className="material-symbols-outlined text-4xl text-blue-600">menu_book</span>
          </div>
          <h2 className="text-xl font-extrabold text-blue-600">RuangBaca</h2>
          <p className="text-xs text-slate-500 mt-1">Portal Perpustakaan</p>
        </div>
        <nav className="flex-1 space-y-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm hover:translate-x-1 transition-transform duration-200 text-left ${
              activeTab === 'overview' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            Ringkasan
          </button>
          <button
            onClick={() => setActiveTab('books')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm hover:translate-x-1 transition-transform duration-200 text-left ${
              activeTab === 'books' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined">menu_book</span>
            Kelola Buku
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm hover:translate-x-1 transition-transform duration-200 text-left ${
              activeTab === 'loans' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined">bookmarks</span>
            Peminjaman
            {stats.pendingLoans > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                {stats.pendingLoans}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm hover:translate-x-1 transition-transform duration-200 text-left ${
              activeTab === 'users' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined">group</span>
            Kelola Pengguna
          </button>
        </nav>
        <div className="mt-auto space-y-1 pt-4 border-t border-slate-200">
          <button
            onClick={() => void fetchData({ showLoader: false })}
            disabled={isRefreshing}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-2 bg-slate-100 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-200 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined text-sm ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
            {isRefreshing ? 'Memperbarui...' : 'Refresh Data'}
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 mb-2 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Tambah Buku
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm hover:translate-x-1 transition-transform duration-200"
          >
            <span className="material-symbols-outlined">logout</span>
            Keluar
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-[280px] pt-4 md:pt-20 px-4 md:px-8 pb-24 md:pb-12 w-full max-w-[1280px] mx-auto overflow-y-auto">
        {/* Mobile Navigation */}
        <div className="md:hidden flex flex-wrap gap-2 mb-6 sticky top-0 z-10 bg-[#f9f9ff] py-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 min-w-[100px] py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'overview' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Ringkasan
          </button>
          <button
            onClick={() => setActiveTab('books')}
            className={`flex-1 min-w-[100px] py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'books' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Buku
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`flex-1 min-w-[100px] py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'loans' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Peminjaman
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 min-w-[100px] py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'users' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Pengguna
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold text-sm hover:bg-green-700 transition-all"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
          <button
            onClick={() => void fetchData({ showLoader: false })}
            disabled={isRefreshing}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold text-sm transition-all hover:bg-slate-200 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <span className={`material-symbols-outlined ${isRefreshing ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>

        {(pageNotice || isRefreshing) && (
          <div className={`mb-6 rounded-xl border px-4 py-3 flex items-start justify-between gap-4 ${pageNotice ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
            <div>
              <p className="font-semibold text-sm">
                {pageNotice ? 'Sebagian data admin perlu dimuat ulang' : 'Memperbarui dashboard admin'}
              </p>
              <p className="text-sm">
                {pageNotice || 'Sistem sedang mengambil data terbaru dari server.'}
              </p>
            </div>
            <button
              onClick={() => void fetchData({ showLoader: false })}
              className="shrink-0 px-3 py-2 rounded-lg bg-white text-sm font-semibold border border-current/20 hover:bg-white/80 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' ? (
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Ringkasan</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
              <div className="bg-white/70 backdrop-blur-md rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-500">Total Buku</p>
                  <span className="material-symbols-outlined text-blue-600">menu_book</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalBooks}</p>
              </div>
              <div className="bg-white/70 backdrop-blur-md rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-500">Total Peminjaman</p>
                  <span className="material-symbols-outlined text-slate-600">bookmarks</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalLoans}</p>
              </div>
              <div className="bg-white/70 backdrop-blur-md rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-500">Menunggu Konfirmasi</p>
                  <span className="material-symbols-outlined text-yellow-600">schedule</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{stats.pendingLoans}</p>
              </div>
              <div className="bg-white/70 backdrop-blur-md rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-500">Dipinjam</p>
                  <span className="material-symbols-outlined text-blue-600">book</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{stats.activeLoans}</p>
              </div>
              <div className="bg-white/70 backdrop-blur-md rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-slate-500">Dikembalikan</p>
                  <span className="material-symbols-outlined text-green-600">check_circle</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{stats.returnedLoans}</p>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-slate-900 mb-4">Peminjaman Terbaru</h2>
            {isLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-sm text-slate-500">Memuat ringkasan peminjaman...</p>
              </div>
            ) : loans.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">bookmarks</span>
                <p className="text-lg text-slate-600 mb-2">
                  {activeError ? 'Ringkasan peminjaman belum bisa ditampilkan.' : 'Belum ada aktivitas peminjaman.'}
                </p>
                <p className="text-sm text-slate-500">{activeError || 'Data terbaru akan muncul di sini.'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {loans.slice(0, 5).map((loan) => (
                  <div key={loan.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="w-20 h-28 bg-slate-100 rounded-md overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center text-slate-400">
                          {(() => {
                            const url = getCoverUrl(loan.cover_image);
                            return url ? (
                              <img 
                                src={url} 
                                alt={loan.title} 
                                className="w-full h-full object-cover" 
                                crossOrigin="anonymous"
                              />
                            ) : (
                              <span className="material-symbols-outlined text-3xl">menu_book</span>
                            );
                          })()}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{loan.title}</h3>
                          <p className="text-sm text-slate-600 mb-2">{loan.author}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">person</span>
                              {loan.nim}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(loan.status)}`}>
                        {getStatusText(loan.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'books' ? (
          <div>
            <div className="flex justify-between items-end mb-6 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Kelola Buku</h1>
                <p className="text-sm text-slate-500 mt-1">Daftar semua buku di perpustakaan</p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Tambah Buku
              </button>
            </div>

            {isLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-sm text-slate-500">Memuat data buku...</p>
              </div>
            ) : books.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">menu_book</span>
                <p className="text-lg text-slate-600 mb-2">
                  {activeError ? 'Data buku belum bisa ditampilkan.' : 'Belum ada buku di perpustakaan'}
                </p>
                <p className="text-sm text-slate-500 mb-4">
                  {activeError || 'Tambahkan koleksi pertama untuk mulai mengelola perpustakaan.'}
                </p>
                <button
                  onClick={() => activeError ? void fetchData({ showLoader: false }) : setIsModalOpen(true)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors active:scale-95 shadow-sm"
                >
                  {activeError ? 'Coba Lagi' : 'Tambah Buku Pertama'}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {books.map((book) => (
                  <div key={book.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col h-full shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex gap-4 mb-4">
                      <div className="w-24 h-36 bg-slate-100 rounded-md overflow-hidden shrink-0 shadow-sm border border-slate-200 flex items-center justify-center text-slate-400">
                        {(() => {
                          const url = getCoverUrl(book.cover_image);
                          return url ? (
                            <img 
                              src={url} 
                              alt={book.title} 
                              className="w-full h-full object-cover" 
                              crossOrigin="anonymous"
                            />
                          ) : (
                            <span className="material-symbols-outlined text-4xl">menu_book</span>
                          );
                        })()}
                      </div>
                      <div className="flex flex-col justify-start pt-1 flex-1">
                        <h3 className="text-lg font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors line-clamp-2">{book.title}</h3>
                        <p className="text-sm text-slate-600 mb-1">{book.author}</p>
                        {book.rak && (
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">shelves</span>
                            Rak: {book.rak}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-2">
                      {book.file_url && (
                        <a
                          href={`${BACKEND_BASE_URL}/uploads/${book.file_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-sm">download</span>
                          File
                        </a>
                      )}
                      <button
                        onClick={() => handleOpenEditModal(book)}
                        className="px-3 py-2 bg-yellow-600 text-white text-sm font-semibold rounded-lg hover:bg-yellow-700 transition-colors active:scale-95 shadow-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBook(book.id)}
                        disabled={isDeleting === book.id}
                        className="px-3 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors active:scale-95 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isDeleting === book.id ? '...' : 'Hapus'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'loans' ? (
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Data Peminjaman</h1>
            {isLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-sm text-slate-500">Memuat data peminjaman...</p>
              </div>
            ) : loans.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">bookmarks</span>
                <p className="text-lg text-slate-600 mb-2">
                  {activeError ? 'Data peminjaman belum bisa ditampilkan.' : 'Belum ada peminjaman'}
                </p>
                <p className="text-sm text-slate-500">{activeError || 'Saat ada transaksi, data akan tampil di sini.'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {loans.map((loan) => (
                  <div key={loan.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="w-20 h-28 bg-slate-100 rounded-md overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center text-slate-400">
                          {(() => {
                            const url = getCoverUrl(loan.cover_image);
                            return url ? (
                              <img 
                                src={url} 
                                alt={loan.title} 
                                className="w-full h-full object-cover" 
                                crossOrigin="anonymous"
                              />
                            ) : (
                              <span className="material-symbols-outlined text-3xl">menu_book</span>
                            );
                          })()}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{loan.title}</h3>
                          <p className="text-sm text-slate-600 mb-2">{loan.author}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">person</span>
                              {loan.nim}
                            </span>
                            {loan.borrow_date && (
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">calendar_today</span>
                                Tgl Pinjam: {loan.borrow_date}
                              </span>
                            )}
                            {loan.return_date && (
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">check_circle</span>
                                Tgl Kembali: {loan.return_date}
                              </span>
                            )}
                            {loan.rak && (
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">shelves</span>
                                Rak: {loan.rak}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(loan.status)}`}>
                          {getStatusText(loan.status)}
                        </span>
                        {loan.status === 'pending' && (
                          <button
                            onClick={() => handleConfirmLoan(loan.id)}
                            disabled={isConfirming === loan.id}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors active:scale-95 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                            {isConfirming === loan.id ? '...' : 'Konfirmasi'}
                          </button>
                        )}
                        {loan.status === 'dipinjam' && (
                          <button
                            onClick={() => handleConfirmReturn(loan.id)}
                            disabled={isReturning === loan.id}
                            className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors active:scale-95 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                          >
                            {isReturning === loan.id ? '...' : 'Tandai Kembali'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-end mb-6 border-b border-slate-200 pb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Kelola Pengguna</h1>
                <p className="text-sm text-slate-500 mt-1">Daftar semua pengguna</p>
              </div>
              <button
                onClick={() => setIsUserModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors active:scale-95 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Tambah Pengguna
              </button>
            </div>

            {isLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-sm text-slate-500">Memuat data pengguna...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">group</span>
                <p className="text-lg text-slate-600 mb-2">
                  {activeError ? 'Data pengguna belum bisa ditampilkan.' : 'Belum ada pengguna yang tercatat.'}
                </p>
                <p className="text-sm text-slate-500">{activeError || 'Tambahkan pengguna baru untuk mulai menggunakan sistem.'}</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">NIM</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal Dibuat</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-900">{u.nim}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${u.role === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-200' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{u.created_at.split('T')[0]}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {user?.id !== u.id && (
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-semibold"
                              >
                                Hapus
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Book Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transform transition-all">
            <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">Tambah Buku Baru</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-red-500 transition-colors focus:outline-none"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmitBook} className="flex flex-col">
              <div className="p-8 flex flex-col gap-6 overflow-y-auto max-h-[70vh]">
                <div className="w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 flex flex-col items-center justify-center p-12 relative group transition-all duration-200">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
                    <span className="material-symbols-outlined text-blue-600 text-3xl">image</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Gambar Sampul Buku</p>
                  <p className="text-xs text-slate-500 mb-6 text-center">Format pendukung: JPG, PNG (Maks 5MB)</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={(e) => e.target.files && setCoverImage(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  {coverImage && (
                    <div className="mt-4 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
                      {coverImage.name}
                    </div>
                  )}
                </div>

                <div className="w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 flex flex-col items-center justify-center p-12 relative group transition-all duration-200">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
                    <span className="material-symbols-outlined text-blue-600 text-3xl">description</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">File Buku (PDF)</p>
                  <p className="text-xs text-slate-500 mb-6 text-center">Format pendukung: PDF (Maks 10MB)</p>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => e.target.files && setBookFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    required
                  />
                  {bookFile && (
                    <div className="mt-4 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
                      {bookFile.name}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-600">Judul Buku</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-slate-900 outline-none"
                      placeholder="Contoh: Pengantar Ilmu Komputer"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-600">Nama Penulis</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-slate-900 outline-none"
                      placeholder="Masukkan nama penulis"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-600">Lokasi Rak (Opsional)</label>
                    <input
                      type="text"
                      value={rak}
                      onChange={(e) => setRak(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-slate-900 outline-none"
                      placeholder="Contoh: A-1"
                    />
                  </div>
                </div>
              </div>
              <div className="px-8 py-5 border-t border-slate-200 flex justify-end items-center gap-4 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors px-4 py-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className={`px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 hover:shadow-md transition-all ${
                    isUploading ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'
                  }`}
                >
                  {isUploading ? 'Mengunggah...' : 'Simpan Buku'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {isEditModalOpen && editingBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transform transition-all">
            <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">Edit Buku</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-red-500 transition-colors focus:outline-none"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleEditBook} className="flex flex-col">
              <div className="p-8 flex flex-col gap-6 overflow-y-auto max-h-[70vh]">
                <div className="w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 flex flex-col items-center justify-center p-12 relative group transition-all duration-200">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
                    <span className="material-symbols-outlined text-blue-600 text-3xl">image</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">Gambar Sampul Buku (Opsional)</p>
                  <p className="text-xs text-slate-500 mb-6 text-center">Biarkan kosong jika tidak ingin mengubah</p>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/jpg"
                    onChange={(e) => e.target.files && setCoverImage(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {coverImage && (
                    <div className="mt-4 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
                      {coverImage.name}
                    </div>
                  )}
                </div>

                <div className="w-full rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 flex flex-col items-center justify-center p-12 relative group transition-all duration-200">
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
                    <span className="material-symbols-outlined text-blue-600 text-3xl">description</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mb-2">File Buku (PDF, Opsional)</p>
                  <p className="text-xs text-slate-500 mb-6 text-center">Biarkan kosong jika tidak ingin mengubah</p>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => e.target.files && setBookFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {bookFile && (
                    <div className="mt-4 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
                      {bookFile.name}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-600">Judul Buku</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-slate-900 outline-none"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-600">Nama Penulis</label>
                    <input
                      type="text"
                      value={author}
                      onChange={(e) => setAuthor(e.target.value)}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-slate-900 outline-none"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-2 flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-600">Lokasi Rak</label>
                    <input
                      type="text"
                      value={rak}
                      onChange={(e) => setRak(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-slate-900 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="px-8 py-5 border-t border-slate-200 flex justify-end items-center gap-4 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors px-4 py-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className={`px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 hover:shadow-md transition-all ${
                    isUploading ? 'opacity-70 cursor-not-allowed' : 'active:scale-95'
                  }`}
                >
                  {isUploading ? 'Memperbarui...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transform transition-all">
            <div className="px-8 py-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">Tambah Pengguna Baru</h2>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-red-500 transition-colors focus:outline-none"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddUser} className="flex flex-col">
              <div className="p-8 flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-600">NIM</label>
                  <input
                    type="text"
                    value={userNim}
                    onChange={(e) => setUserNim(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-slate-900 outline-none"
                    placeholder="Masukkan NIM"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-600">Password</label>
                  <input
                    type="password"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-slate-900 outline-none"
                    placeholder="Masukkan password"
                    minLength={6}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-semibold text-slate-600">Role</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="user"
                        checked={userRole === 'user'}
                        onChange={(e) => {
                          setUserRole(e.target.value as 'user');
                          setUserPin('');
                        }}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-slate-700">User</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="admin"
                        checked={userRole === 'admin'}
                        onChange={(e) => setUserRole(e.target.value as 'admin')}
                        className="w-4 h-4 text-blue-600"
                      />
                      <span className="text-sm text-slate-700">Admin</span>
                    </label>
                  </div>
                </div>
                {userRole === 'admin' && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-semibold text-slate-600">PIN (6 digit)</label>
                    <input
                      type="text"
                      value={userPin}
                      onChange={(e) => setUserPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      className="w-full px-4 py-3 rounded-lg bg-slate-50 border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all text-slate-900 outline-none"
                      placeholder="Masukkan 6 digit PIN"
                      maxLength={6}
                    />
                  </div>
                )}
              </div>
              <div className="px-8 py-5 border-t border-slate-200 flex justify-end items-center gap-4 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors px-4 py-2"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow-sm hover:bg-blue-700 hover:shadow-md transition-all active:scale-95"
                >
                  Tambah Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
