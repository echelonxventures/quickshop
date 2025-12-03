import { configureStore } from '@reduxjs/toolkit';

const initialState = {
  cart: {
    items: [],
    total: 0
  },
  user: {
    isAuthenticated: false,
    profile: null
  },
  ui: {
    loading: false,
    error: null
  }
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    default:
      return state;
  }
};

export const store = configureStore({
  reducer: rootReducer,
});