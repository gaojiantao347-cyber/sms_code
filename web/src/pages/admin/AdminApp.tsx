import { Button, Card, Form, Input, Layout, Menu, Space, Tag, Typography } from "antd";
import type { MenuProps } from "antd";
import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router";
import { AdminAuthContext } from "./adminAuth";

const { Header, Content } = Layout;

const adminNavItems: MenuProps["items"] = [
  { key: "/admin/redeem-codes", label: <Link to="/admin/redeem-codes">兑换码管理</Link> },
  { key: "/admin/providers", label: <Link to="/admin/providers">Provider 配置</Link> }
];

export function AdminApp() {
  const location = useLocation();
  const [form] = Form.useForm<{ adminToken: string }>();
  const [adminToken, setAdminToken] = useState("");

  function handleSubmit(values: { adminToken: string }) {
    setAdminToken(values.adminToken.trim());
  }

  if (!adminToken) {
    return (
      <Layout className="app-shell admin-login-shell">
        <Content className="admin-login-main">
          <Card className="admin-login-card">
            <Space direction="vertical" size={20} style={{ width: "100%" }}>
              <div>
                <Typography.Title level={2} style={{ marginBottom: 8 }}>后台管理</Typography.Title>
                <Typography.Text type="secondary">请输入后台访问令牌后继续。</Typography.Text>
              </div>
              <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <Form.Item name="adminToken" label="访问令牌" rules={[{ required: true, whitespace: true, message: "请输入后台访问令牌" }]}>
                  <Input.Password placeholder="后台访问令牌" autoFocus />
                </Form.Item>
                <Button type="primary" htmlType="submit" block>进入后台</Button>
              </Form>
              <Link to="/redeem">返回用户端</Link>
            </Space>
          </Card>
        </Content>
      </Layout>
    );
  }

  return (
    <AdminAuthContext.Provider value={{ adminToken }}>
      <Layout className="app-shell">
        <Header className="app-header admin-header">
          <Menu className="app-nav" mode="horizontal" theme="dark" selectedKeys={[getSelectedKey(location.pathname)]} items={adminNavItems} />
          <Space className="app-status" size={8}>
            <Tag color="cyan">Authorized</Tag>
            <Button size="small" onClick={() => setAdminToken("")}>退出</Button>
          </Space>
        </Header>
        <Content className="app-main">
          <Outlet />
        </Content>
      </Layout>
    </AdminAuthContext.Provider>
  );
}

function getSelectedKey(pathname: string) {
  if (pathname.startsWith("/admin/redeem-codes")) {
    return "/admin/redeem-codes";
  }

  if (pathname.startsWith("/admin/providers")) {
    return "/admin/providers";
  }

  return "/admin";
}
