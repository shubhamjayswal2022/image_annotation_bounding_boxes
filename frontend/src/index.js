import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { store } from "./store/store";
import "./index.css";

// Suppress ResizeObserver loop warnings (these are benign)
const originalError = console.error;
console.error = (...args) => {
  if (
    args[0]?.toString().includes("ResizeObserver loop") ||
    args[0]?.toString().includes("ResizeObserver loop completed")
  ) {
    return;
  }
  originalError(...args);
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

