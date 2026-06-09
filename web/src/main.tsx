import { StrictMode } from "react";
import { App as AntApp, ConfigProvider, theme as antdTheme } from "antd";
import "antd/dist/reset.css";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { router } from "./app/router";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#111111",
          colorSuccess: "#346538",
          colorWarning: "#956400",
          colorError: "#9f2f2d",
          colorInfo: "#1f6c9f",
          colorBgBase: "#fbfbfa",
          colorTextBase: "#111111",
          colorBorder: "#eaeaea",
          borderRadius: 8,
          fontFamily: "'SF Pro Display', 'Geist Sans', 'Helvetica Neue', 'Microsoft YaHei', sans-serif",
          fontFamilyCode: "'Geist Mono', 'SF Mono', Consolas, monospace"
        },
        components: {
          Layout: {
            bodyBg: "#fbfbfa",
            headerBg: "rgba(255, 255, 255, 0.92)"
          },
          Card: {
            colorBgContainer: "#ffffff",
            colorBorderSecondary: "#eaeaea",
            headerFontSize: 15
          },
          Table: {
            colorBgContainer: "#ffffff",
            headerBg: "#f7f6f3",
            headerColor: "#2f3437",
            rowHoverBg: "#fbfbfa"
          }
        }
      }}
    >
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  </StrictMode>
);
