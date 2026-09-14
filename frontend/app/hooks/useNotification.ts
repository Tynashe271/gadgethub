// app/hooks/useNotification.ts
import { useStore } from '../context/StoreContext';

export function useNotification() {
  const { notification, showNotification, hideNotification } = useStore();

  return {
    notification,
    show: showNotification,
    dismiss: hideNotification,
  };
}
