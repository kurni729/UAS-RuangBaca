import axios from 'axios';
import type { AxiosResponse } from 'axios';

export const BACKEND_BASE_URL = 'http://localhost:5000';
const api = axios.create({
    baseURL: `${BACKEND_BASE_URL}/api`,
    timeout: 10000,
    withCredentials: true, // Agar cookie dikirimkan ke server
});

// Helper untuk mendapatkan URL cover gambar yang aman
export function getCoverUrl(coverImage: string | null): string | null {
    if (!coverImage) {
        return null;
    }
    if (coverImage.startsWith('http://') || coverImage.startsWith('https://')) {
        return coverImage;
    }
    return `${BACKEND_BASE_URL}/uploads/${coverImage}`;
}

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableError = (error: unknown) => {
    if (!axios.isAxiosError(error)) {
        return false;
    }

    if (!error.response) {
        return true;
    }

    return error.response.status >= 500 || error.response.status === 429;
};

export const requestWithRetry = async <T>(
    request: () => Promise<AxiosResponse<T>>,
    retries = 2,
    retryDelayMs = 700
) => {
    let attempt = 0;

    while (true) {
        try {
            return await request();
        } catch (error) {
            if (!isRetryableError(error) || attempt >= retries) {
                throw error;
            }

            attempt += 1;
            await delay(retryDelayMs * attempt);
        }
    }
};

export const getApiErrorMessage = (error: unknown, fallback = 'Terjadi kesalahan saat memuat data.') => {
    if (!axios.isAxiosError(error)) {
        return fallback;
    }

    const messageFromServer =
        typeof error.response?.data?.message === 'string' ? error.response.data.message : null;

    if (error.code === 'ECONNABORTED') {
        return 'Server terlalu lama merespons. Silakan coba lagi beberapa saat.';
    }

    if (!error.response) {
        return 'Tidak dapat terhubung ke server. Periksa koneksi internet atau pastikan backend sedang berjalan.';
    }

    if (error.response.status === 429) {
        return 'Terlalu banyak permintaan dalam waktu singkat. Silakan tunggu sebentar lalu coba lagi.';
    }

    if (error.response.status >= 500) {
        return messageFromServer || 'Server sedang mengalami gangguan. Silakan coba lagi.';
    }

    return messageFromServer || fallback;
};

export default api;
