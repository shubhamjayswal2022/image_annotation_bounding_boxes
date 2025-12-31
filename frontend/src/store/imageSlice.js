import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../utils/api";

export const fetchImages = createAsyncThunk(
  "images/fetch",
  async () => {
    const response = await api.get("/images");
    return response.data;
  }
);

export const fetchImage = createAsyncThunk(
  "images/fetchOne",
  async (id) => {
    const response = await api.get(`/images/${id}`);
    return response.data;
  }
);

export const uploadImage = createAsyncThunk(
  "images/upload",
  async (file) => {
    const formData = new FormData();
    formData.append("image", file);
    const response = await api.post("/images", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  }
);

export const updateAnnotations = createAsyncThunk(
  "images/updateAnnotations",
  async ({ id, annotations }) => {
    const response = await api.put(`/images/${id}/annotations`, {
      annotations,
    });
    return response.data;
  }
);

const imageSlice = createSlice({
  name: "images",
  initialState: {
    items: [],
    current: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCurrent: (state) => {
      state.current = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchImages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchImages.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchImages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(fetchImage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchImage.fulfilled, (state, action) => {
        state.loading = false;
        state.current = action.payload;
      })
      .addCase(fetchImage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(uploadImage.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateAnnotations.fulfilled, (state, action) => {
        state.current = action.payload;
        const index = state.items.findIndex(
          (img) => img._id === action.payload._id
        );
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });
  },
});

export const { clearCurrent } = imageSlice.actions;
export default imageSlice.reducer;

