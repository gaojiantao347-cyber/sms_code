import { Layout } from "antd";
import { Outlet } from "react-router";

const { Content } = Layout;

export function App() {
  return (
    <Layout className="app-shell">
      <Content className="app-main">
        <Outlet />
      </Content>
    </Layout>
  );
}
