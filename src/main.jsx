import React, { Suspense, lazy, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "./context/AuthContext.jsx";
import App from "./App.jsx";
import "7.css/dist/7.css";
import "tabulator-tables/dist/css/tabulator.min.css";
import "./styles/index.css";

const MobileMain = lazy(() => import("./mobile/Main.jsx"));

function Root() {
  const [isMobileRoute, setIsMobileRoute] = useState(() => {
    return window.location.pathname.startsWith("/mobile");
  });

  useEffect(() => {
    const check = () => {
      setIsMobileRoute(window.location.pathname.startsWith("/mobile"));
    };
    window.addEventListener("popstate", check);
    return () => window.removeEventListener("popstate", check);
  }, []);

  if (isMobileRoute) {
    return (
      <Suspense
        fallback={
          <div
            style={{
              display: "flex",
              height: "100vh",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "system-ui, sans-serif",
              color: "#64748b",
            }}
          >
            Mobil Tətbiq Yüklənir...
          </div>
        }
      >
        <MobileMain />
      </Suspense>
    );
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </React.StrictMode>
);
