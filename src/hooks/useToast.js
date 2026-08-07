import { useState, useCallback } from 'react';

/**
 * Hook para manejar el estado de un Toast.
 *
 * Uso:
 *   const toast = useToast();
 *   toast.success('Guardado', 'La cápsula se creó correctamente');
 *   toast.error('Error', 'No pudimos guardar los cambios');
 *
 *   // En el JSX:
 *   <Toast {...toast.props} />
 */
function useToast() {
  const [state, setState] = useState({
    open: false,
    variant: 'success',
    title: '',
    message: '',
  });

  const show = useCallback((variant, title, message = '') => {
    setState({ open: true, variant, title, message });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  return {
    success: (title, message) => show('success', title, message),
    error: (title, message) => show('error', title, message),
    close,
    props: {
      open: state.open,
      variant: state.variant,
      title: state.title,
      message: state.message,
      onClose: close,
    },
  };
}

export default useToast;