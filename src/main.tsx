import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Suspense } from "react";
import routes from "virtual:generated-pages";
import { useRoutes } from "react-router-dom";
import "./index.css";

const App = () => {
  const routesElement = useRoutes(routes);
  return (
    <Suspense fallback={<div>Loading...</div>}>
      {routesElement}
    </Suspense>
  );
};

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Root element not found");
}
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
