import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { getApiErrorMessage, requestWithRetry, getCoverUrl } from '../services/api';
import toast from 'react-hot-toast';

interface Book {
  id: number;
  title: string;
  author: string;
  cover_image: string | null;
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

interface ApiListResponse<T> {
  data: T[];
}

export default function UserDashboard() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [activeTab, setActiveTab] = useState<'books' | 'loans'>('books');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBorrowing, setIsBorrowing] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [booksError, setBooksError] = useState<string | null>(null);
  const [loansError, setLoansError] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<string | null>(null);
  const navigate = useNavigate();

  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  const fetchData = useCallback(async ({ showLoader = true }: { showLoader?: boolean } = {}) => {
    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    const [booksResult, loansResult] = await Promise.allSettled([
      requestWithRetry(() => api.get<ApiListResponse<Book>>('/books')),
      requestWithRetry(() => api.get<ApiListResponse<Loan>>('/loans')),
    ]);

    const nextBooksError =
      booksResult.status === 'rejected'
        ? getApiErrorMessage(booksResult.reason, 'Katalog buku gagal dimuat.')
        : null;
    const nextLoansError =
      loansResult.status === 'rejected'
        ? getApiErrorMessage(loansResult.reason, 'Riwayat peminjaman gagal dimuat.')
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

    setBooksError(nextBooksError);
    setLoansError(nextLoansError);

    const nextNotice = [nextBooksError && `Katalog buku: ${nextBooksError}`, nextLoansError && `Riwayat peminjaman: ${nextLoansError}`]
      .filter(Boolean)
      .join(' ');

    setPageNotice(nextNotice || null);

    if (nextNotice) {
      console.error('Gagal mengambil data dashboard:', {
        books: nextBooksError,
        loans: nextLoansError,
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
            navigate('/');
            toast.success('Logout berhasil');
        }
    };

  const handleBorrow = async (bookId: number) => {
    setIsBorrowing(bookId);
    try {
      await api.post('/loans', { book_id: bookId });
      toast.success('Permintaan pinjaman berhasil dikirim!');
      void fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Gagal meminjam buku');
    } finally {
      setIsBorrowing(null);
    }
  };

  const activeError = activeTab === 'books' ? booksError : loansError;

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
              <p className="text-sm font-semibold text-slate-900">{user?.nim || 'User'}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role || 'user'}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-100 overflow-hidden ml-2 border border-slate-300 flex items-center justify-center">
              <span className="material-symbols-outlined text-blue-600">person</span>
            </div>
          </div>
        </div>
      </header>

      {/* SideNavBar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-[280px] z-30 bg-white/80 backdrop-blur-md border-r border-slate-200 shadow-md flex-col p-6 space-y-2 pt-24">
        <div className="flex flex-col items-center mb-8 pb-6 border-b border-slate-200 text-center">
          <div className="w-16 h-16 rounded-lg bg-blue-50 mb-3 flex items-center justify-center border border-slate-200">
            <img
              alt="University Crest"
              className="w-12 h-12 object-contain"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDbbVh75F8PjEcQW5KxX6GXTrtzlvfi815vNvPcQyRt-y-DhM6z198Zg0Yd5yNNuXIECY5PPrn6EFg-neOsq_eDLAqz3iogel6HbJe8iA0F6xTgv-s1-g34DZyd7lyDgIXsM8f-XeHn54CIe15GFyIgF36-iq3wRvzcoQDaUXt4JFxKFdtQjSte3sjrmaKqzfRtRoGUAASHU7RXMsY6u4J_uXu8yGqGhJamKJBfrW1OrjD3sWHMGzF9_"
            />
          </div>
          <h2 className="text-xl font-extrabold text-blue-600">RuangBaca</h2>
          <p className="text-xs text-slate-500 mt-1">Portal Akademik</p>
        </div>
        <nav className="flex-1 space-y-1">
          <button
            onClick={() => setActiveTab('books')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm hover:translate-x-1 transition-transform duration-200 text-left ${
              activeTab === 'books' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined">menu_book</span>
            Katalog Buku
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold text-sm hover:translate-x-1 transition-transform duration-200 text-left ${
              activeTab === 'loans' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined">bookmarks</span>
            Riwayat Peminjaman
          </button>
        </nav>
        <div className="mt-auto space-y-1 pt-4 border-t border-slate-200">
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
            onClick={() => setActiveTab('books')}
            className={`flex-1 min-w-[100px] py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'books' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Katalog Buku
          </button>
          <button
            onClick={() => setActiveTab('loans')}
            className={`flex-1 min-w-[100px] py-2 rounded-lg font-semibold text-sm transition-all ${
              activeTab === 'loans' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Riwayat
          </button>
        </div>

        {(pageNotice || isRefreshing) && (
          <div className={`mb-6 rounded-xl border px-4 py-3 flex items-start justify-between gap-4 ${pageNotice ? 'border-amber-200 bg-amber-50 text-amber-900' : 'border-blue-200 bg-blue-50 text-blue-900'}`}>
            <div>
              <p className="font-semibold text-sm">
                {pageNotice ? 'Sebagian data perlu dimuat ulang' : 'Memperbarui data'}
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
        {activeTab === 'books' ? (
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Katalog Buku</h1>
            {isLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-sm text-slate-500">Memuat katalog buku...</p>
              </div>
            ) : books.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">menu_book</span>
                <p className="text-lg text-slate-600 mb-2">
                  {activeError ? 'Katalog buku belum bisa ditampilkan.' : 'Belum ada buku yang tersedia.'}
                </p>
                <p className="text-sm text-slate-500 mb-4">
                  {activeError || 'Silakan cek lagi beberapa saat ke depan.'}
                </p>
                <button
                  onClick={() => void fetchData({ showLoader: false })}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Coba Lagi
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
                    <div className="mt-auto pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handleBorrow(book.id)}
                        disabled={isBorrowing === book.id}
                        className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors active:scale-95 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {isBorrowing === book.id ? 'Memproses...' : 'Pinjam Buku'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-6">Riwayat Peminjaman</h1>
            {isLoading ? (
              <div className="flex flex-col justify-center items-center py-20 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-sm text-slate-500">Memuat riwayat peminjaman...</p>
              </div>
            ) : loans.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">bookmarks</span>
                <p className="text-lg text-slate-600 mb-2">
                  {activeError ? 'Riwayat peminjaman belum bisa ditampilkan.' : 'Belum ada riwayat peminjaman'}
                </p>
                <p className="text-sm text-slate-500">{activeError || 'Data peminjaman akan muncul di sini.'}</p>
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
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(loan.status)}`}>
                        {getStatusText(loan.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
