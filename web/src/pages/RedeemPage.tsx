import { Alert, Button, Form, Input, Typography } from "antd";
import type { FormProps } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router";
import { redeemService } from "../services/redeemService";
import { getErrorMessage } from "../utils/errorMessage";
import { HistoryPage } from "./HistoryPage";
import { getUserStyleClass } from "./userStyle";

type RedeemFormValues = {
  code: string;
};

export function RedeemPage() {
  const navigate = useNavigate();
  const [historyCode, setHistoryCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit: FormProps<RedeemFormValues>["onFinish"] = async (values) => {
    const trimmedCode = values.code.trim();

    setLoading(true);
    setErrorMessage("");

    try {
      setHistoryCode(trimmedCode);
      const result = await redeemService.redeem(trimmedCode);
      navigate(`/tasks/${result.taskId}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={getUserStyleClass()}>
      <section className="web-hero-layout web-redeem-section">
        <aside className="web-redeem-panel" aria-label="兑换码表单">
          <div className="web-panel-heading">
            <div>
              <Typography.Text className="web-kicker">Redeem</Typography.Text>
              <Typography.Title level={3}>创建接码任务</Typography.Title>
              <Typography.Text type="secondary">提交后自动进入任务跟踪页</Typography.Text>
            </div>
          </div>
          <Form layout="vertical" requiredMark={false} onFinish={handleSubmit} autoComplete="off">
            <Form.Item<RedeemFormValues>
              label="兑换码"
              name="code"
              extra="提交后会创建接码任务，并自动进入任务跟踪页。"
              rules={[{ required: true, whitespace: true, message: "请输入兑换码" }]}
            >
              <Input
                size="large"
                placeholder="输入兑换码"
                disabled={loading}
                allowClear
                onBlur={(event) => setHistoryCode(event.target.value.trim())}
              />
            </Form.Item>
            {errorMessage && <Alert message={errorMessage} type="error" showIcon className="web-inline-alert" />}
            <Button type="primary" size="large" htmlType="submit" loading={loading} block>
              获取手机号
            </Button>
          </Form>
        </aside>
      </section>

      <section className="web-history-section">
        <div className="web-section-heading">
          <div>
            <Typography.Text className="web-kicker">最近任务</Typography.Text>
            <Typography.Title level={3}>最近接码记录</Typography.Title>
          </div>
        </div>
        <HistoryPage showHero={false} compact redeemCodeKeyword={historyCode} />
      </section>
    </main>
  );
}
