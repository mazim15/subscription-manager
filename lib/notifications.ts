import toast from 'react-hot-toast';

export const notify = {
  success: (message: string) => {
    toast.success(message, {
      style: {
        background: '#1E293B', // dark slate
        color: '#fff',
      },
      iconTheme: {
        primary: '#22C55E', // green
        secondary: '#fff',
      },
    });
  },

  error: (message: string) => {
    toast.error(message, {
      style: {
        background: '#1E293B',
        color: '#fff', 
      },
      iconTheme: {
        primary: '#EF4444', // red
        secondary: '#fff',
      },
    });
  },

  info: (message: string) => {
    toast(message, {
      icon: 'ℹ️',
      style: {
        background: '#1E293B',
        color: '#fff',
      },
    });
  },

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(
      promise,
      {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      },
      {
        style: {
          background: '#1E293B',
          color: '#fff',
        },
        success: {
          iconTheme: {
            primary: '#22C55E',
            secondary: '#fff',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: '#fff',
          },
        },
      }
    );
  },
}; 