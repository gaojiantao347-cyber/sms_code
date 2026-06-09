import { Card, Col, Row, Typography } from "antd";

const placeholderStats = [
  { title: "今日兑换次数", value: "待接入" },
  { title: "进行中任务", value: "待接入" },
  { title: "可用 Provider", value: "待接入" }
];

export function AdminHomePage() {
  return (
    <div className="page-stack">
      <Card className="page-hero">
        <Typography.Title level={2} style={{ marginBottom: 8 }}>统计首页</Typography.Title>
        <Typography.Text type="secondary">统计数据待接入，当前仅保留后台总览入口。</Typography.Text>
      </Card>

      <Row gutter={[16, 16]}>
        {placeholderStats.map((stat) => (
          <Col key={stat.title} xs={24} md={8}>
            <Card>
              <Typography.Text type="secondary">{stat.title}</Typography.Text>
              <Typography.Title level={3} style={{ marginTop: 8, marginBottom: 0 }}>{stat.value}</Typography.Title>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
