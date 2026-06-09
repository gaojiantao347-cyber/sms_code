import { Alert, Button, Card, Empty, Form, Input, Pagination, Select, Space, Typography } from "antd";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { historyService } from "../services/historyService";
import type { HistoryItem, HistoryListResult, HistoryQuery } from "../types/history";
import { SmsMode } from "../types/redeem";
import { SmsTaskStatus } from "../types/smsTask";
import { getErrorMessage } from "../utils/errorMessage";
import { getUserStyleClass } from "./userStyle";

const pageSize = 20;
const compactPageSize = 5;

const statusLabels: Record<string, string> = {
  [SmsTaskStatus.Created]: "已创建",
  [SmsTaskStatus.CodeValidated]: "兑换码已校验",
  [SmsTaskStatus.NumberAcquiring]: "正在获取手机号",
  [SmsTaskStatus.NumberAcquired]: "已获取手机号",
  [SmsTaskStatus.WaitingCode]: "等待验证码",
  [SmsTaskStatus.CodeReceived]: "已收到验证码",
  [SmsTaskStatus.Completed]: "已完成",
  [SmsTaskStatus.Cancelled]: "已取消",
  [SmsTaskStatus.Timeout]: "已超时",
  [SmsTaskStatus.Failed]: "失败"
};

const smsModeLabels: Record<string, string> = {
  [SmsMode.ShortTerm]: "短期租号",
  [SmsMode.LongTerm]: "长期租号"
};

type HistoryFilterValues = {
  redeemCodeKeyword?: string;
  platformCode?: string;
  smsMode?: string;
  status?: string;
};

type HistoryPageProps = {
  showHero?: boolean;
  compact?: boolean;
};

export function HistoryPage({ showHero = true, compact = false }: HistoryPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [form] = Form.useForm<HistoryFilterValues>();
  const [result, setResult] = useState<HistoryListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const query = useMemo<HistoryQuery>(() => ({
    redeemCodeKeyword: compact ? undefined : searchParams.get("redeemCodeKeyword") ?? undefined,
    platformCode: compact ? undefined : searchParams.get("platformCode") ?? undefined,
    smsMode: compact ? undefined : (searchParams.get("smsMode") as HistoryQuery["smsMode"]) ?? undefined,
    status: compact ? undefined : (searchParams.get("status") as HistoryQuery["status"]) ?? undefined,
    page: compact ? 1 : Number(searchParams.get("page") ?? 1),
    pageSize: compact ? compactPageSize : pageSize
  }), [compact, searchParams]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await historyService.list(query);
      setResult(data);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (compact) {
      return;
    }

    form.setFieldsValue({
      redeemCodeKeyword: searchParams.get("redeemCodeKeyword") ?? undefined,
      platformCode: searchParams.get("platformCode") ?? undefined,
      smsMode: searchParams.get("smsMode") ?? undefined,
      status: searchParams.get("status") ?? undefined
    });
  }, [compact, form, searchParams]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  function handleSubmit(values: HistoryFilterValues) {
    const nextParams = new URLSearchParams();

    Object.entries(values).forEach(([key, value]) => {
      if (typeof value === "string" && value.trim()) {
        nextParams.set(key, value.trim());
      }
    });

    nextParams.set("page", "1");
    setSearchParams(nextParams);
  }

  function handleReset() {
    form.resetFields();
    setSearchParams(new URLSearchParams({ page: "1" }));
  }

  function goPage(page: number) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(page));
    setSearchParams(nextParams);
  }

  const currentPage = result?.page ?? query.page ?? 1;
  const items = result?.items ?? [];
  const shellClassName = compact ? "web-history-list compact-web-history" : `web-history-page ${getUserStyleClass()}`;

  return (
    <div className={shellClassName}>
      {showHero && (
        <section className="web-history-hero">
          <Typography.Text className="web-kicker">History</Typography.Text>
          <Typography.Title level={1}>接码记录</Typography.Title>
          <Typography.Paragraph>用 Web 任务列表查看每一次兑换、拿号和验证码结果。</Typography.Paragraph>
        </section>
      )}

      {!compact && (
        <Card className="web-filter-panel">
          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <div className="history-filter-grid">
              <Form.Item label="兑换码" name="redeemCodeKeyword">
                <Input allowClear placeholder="输入兑换码关键字" />
              </Form.Item>
              <Form.Item label="平台" name="platformCode">
                <Input allowClear placeholder="如 telegram" />
              </Form.Item>
              <Form.Item label="类型" name="smsMode">
                <Select allowClear placeholder="全部" options={[
                  { value: SmsMode.ShortTerm, label: "短期租号" },
                  { value: SmsMode.LongTerm, label: "长期租号" }
                ]} />
              </Form.Item>
              <Form.Item label="状态" name="status">
                <Select allowClear placeholder="全部" options={Object.values(SmsTaskStatus).map((status) => ({ value: status, label: statusLabels[status] }))} />
              </Form.Item>
              <Form.Item className="history-filter-actions">
                <Space>
                  <Button type="primary" htmlType="submit" loading={loading}>查询</Button>
                  <Button onClick={handleReset} disabled={loading}>重置</Button>
                </Space>
              </Form.Item>
            </div>
          </Form>
        </Card>
      )}

      {errorMessage && <Alert message={errorMessage} type="error" showIcon />}

      <div className="web-task-list" aria-busy={loading}>
        {loading ? (
          Array.from({ length: compact ? 3 : 5 }).map((_, index) => <div className="web-task-row skeleton-row" key={index} />)
        ) : items.length > 0 ? (
          items.map((item) => <HistoryListItem key={item.taskId} item={item} />)
        ) : (
          <div className="web-empty-state">
            <Empty description="暂无接码记录" />
            {!compact && <Button type="primary"><Link to="/redeem">去兑换</Link></Button>}
          </div>
        )}
      </div>

      {!compact && result && result.total > pageSize && (
        <div className="history-pagination">
          <Pagination current={currentPage} pageSize={pageSize} total={result.total} showSizeChanger={false} onChange={goPage} />
        </div>
      )}
    </div>
  );
}

function HistoryListItem({ item }: { item: HistoryItem }) {
  return (
    <Link className="web-task-row" to={`/history/${item.taskId}`}>
      <div className="row-primary">
        <span className={`status-dot status-${getStatusTone(item.status)}`} />
        <div>
          <Typography.Text className="history-code">{item.redeemCodeMasked}</Typography.Text>
          <div className="history-platform">{item.platform.name}<span>{item.platform.code}</span></div>
        </div>
      </div>
      <Meta label="类型" value={smsModeLabels[item.smsMode] ?? item.smsMode} />
      <Meta label="手机号" value={item.phoneNumberMasked ?? "未获取"} />
      <Meta label="创建" value={formatDateTime(item.createdAt)} />
      <span className={`status-pill status-${getStatusTone(item.status)}`}>{statusLabels[item.status] ?? item.status}</span>
    </Link>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="history-meta-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date).replace(/\//g, "-");
}

function getStatusTone(status: SmsTaskStatus) {
  if (status === SmsTaskStatus.Completed || status === SmsTaskStatus.CodeReceived) {
    return "success";
  }

  if (status === SmsTaskStatus.Failed || status === SmsTaskStatus.Timeout || status === SmsTaskStatus.Cancelled) {
    return "danger";
  }

  if (status === SmsTaskStatus.WaitingCode || status === SmsTaskStatus.NumberAcquiring) {
    return "active";
  }

  return "neutral";
}
