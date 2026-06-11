import { createBrowserRouter, Navigate } from "react-router";
import { App } from "./App";
import { AdminApp } from "../pages/admin/AdminApp";
import { AdminHomePage } from "../pages/admin/AdminHomePage";
import { ProviderAdminPage } from "../pages/admin/ProviderAdminPage";
import { RedeemCodeAdminPage } from "../pages/admin/RedeemCodeAdminPage";
import { HistoryDetailPage } from "../pages/HistoryDetailPage";
import { RedeemPage } from "../pages/RedeemPage";
import { TaskPage } from "../pages/TaskPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Navigate to="/redeem" replace /> },
      { path: "redeem", element: <RedeemPage /> },
      { path: "redeem/:template", element: <Navigate to="/redeem" replace /> },
      { path: "tasks/:taskId", element: <TaskPage /> },
      { path: "history", element: <Navigate to="/redeem" replace /> },
      { path: "history/:taskId", element: <HistoryDetailPage /> }
    ]
  },
  {
    path: "/admin",
    element: <AdminApp />,
    children: [
      { index: true, element: <AdminHomePage /> },
      { path: "redeem-codes", element: <RedeemCodeAdminPage /> },
      { path: "providers", element: <ProviderAdminPage /> }
    ]
  }
]);
