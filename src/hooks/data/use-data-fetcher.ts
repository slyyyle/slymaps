import { useCallback } from 'react';
import { useToast } from '@/hooks/ui/use-toast';

interface FetcherOptions<T> {
  fetcher: () => Promise<T>;
  onSuccess: (data: T) => void;
  onError: (error: unknown) => void;
  setLoading: (loading: boolean) => void;
}

export function useDataFetcher<T>({
  fetcher,
  onSuccess,
  onError,
  setLoading,
}: FetcherOptions<T>) {
  return useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetcher();
      onSuccess(data);
    } catch (error) {
      onError(error);
    } finally {
      setLoading(false);
    }
  }, [fetcher, onSuccess, onError, setLoading]);
}

interface ToastingFetcherOptions<T> {
  fetcher: () => Promise<T>;
  setData: (data: T) => void;
  setLoading: (loading: boolean) => void;
  toastErrorTitle: string;
  toastErrorMessage: string;
}

export function useToastingDataFetcher<T>({
  fetcher,
  setData,
  setLoading,
  toastErrorTitle,
  toastErrorMessage,
}: ToastingFetcherOptions<T>) {
  const { toast } = useToast();

  return useDataFetcher({
    fetcher,
    onSuccess: setData,
    onError: (error) => {
      console.error(toastErrorTitle, error);
      toast({
        title: toastErrorTitle,
        description: toastErrorMessage,
        variant: 'destructive',
      });
    },
    setLoading,
  });
}

interface ParameterizedFetcherOptions<T, P> {
  fetcher: (params: P) => Promise<T>;
  onSuccess: (data: T) => void;
  onError: (error: unknown) => void;
  setLoading: (loading: boolean) => void;
}

export function useParameterizedFetcher<T, P>({
  fetcher,
  onSuccess,
  onError,
  setLoading,
}: ParameterizedFetcherOptions<T, P>) {
  return useCallback(async (params: P) => {
    setLoading(true);
    try {
      const data = await fetcher(params);
      onSuccess(data);
    } catch (error) {
      onError(error);
    } finally {
      setLoading(false);
    }
  }, [fetcher, onSuccess, onError, setLoading]);
} 