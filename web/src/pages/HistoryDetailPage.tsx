import { Alert, Button, Card, Result, Spin, Typography } from "antd";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { historyService } from "../services/historyService";
import type { HistoryDetail } from "../types/history";
import { SmsMode } from "../types/redeem";
import { SmsTaskStatus } from "../types/smsTask";
import { getErrorMessage } from "../utils/errorMessage";
import { getUserStyleClass } from "./userStyle";

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

export function HistoryDetailPage() {
  const { taskId } = useParams();
  const [detail, setDetail] = useState<HistoryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDetail = useCallback(async () => {
    if (!taskId) {
      setErrorMessage("任务 ID 不存在");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const data = await historyService.getDetail(taskId);
      setDetail(data);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void loadDetail();
  }, [loadDetail]);

  if (loading) {
    return (
      <div className={`web-detail-page ${getUserStyleClass()}`}>
        <div className="web-loading-panel"><Spin tip="正在加载历史详情..." /></div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={`web-detail-page ${getUserStyleClass()}`}>
        <Result
          status="warning"
          title="历史详情不可用"
          subTitle={errorMessage || "任务 ID 不存在或记录已不可访问。"}
          extra={<Button type="primary"><Link to="/history">返回历史列表</Link></Button>}
        />
      </div>
    );
  }

  return (
    <div className={`web-detail-page ${getUserStyleClass()}`}>
      <section className="web-detail-hero">
        <div>
          <Link className="web-text-link" to="/history">返回历史</Link>
          <Typography.Text className="web-kicker">Record Detail</Typography.Text>
          <Typography.Title level={1}>{detail.platform.name}</Typography.Title>
          <Typography.Paragraph>任务 ID：<span className="mono-text">{detail.taskId}</span></Typography.Paragraph>
        </div>
        <span className={`status-pill status-${getStatusTone(detail.status)}`}>{statusLabels[detail.status] ?? detail.status}</span>
      </section>

      {errorMessage && <Alert message={errorMessage} type="error" showIcon />}

      <section className="web-detail-layout">
        <div className="web-summary-grid">
          <SummaryCard label="兑换码" value={detail.redeemCodeMasked} />
          <SummaryCard label="手机号" value={detail.phoneNumberMasked ?? "未获取"} />
          <SummaryCard label="类型" value={smsModeLabels[detail.smsMode] ?? detail.smsMode} />
          <SummaryCard label="Provider" value={detail.providerName ?? "-"} />
          <SummaryCard label="创建时间" value={detail.createdAt} />
          <SummaryCard label="结束时间" value={detail.finishedAt ?? "-"} />
        </div>

        <aside className="web-timeline-panel">
          <div className="web-section-heading">
            <div>
              <Typography.Text className="web-kicker">Timeline</Typography.Text>
              <Typography.Title level={3}>状态流转</Typography.Title>
            </div>
          </div>
          <div className="web-timeline">
            {detail.statusLogs.length > 0 ? detail.statusLogs.map((log, index) => (
              <div className="web-timeline-item" key={`${log.status}-${log.createdAt}-${index}`}>
                <span className={`status-dot status-${getStatusTone(log.status)}`} />
                <div>
                  <strong>{statusLabels[log.status] ?? log.status}</strong>
                  <span>{log.createdAt}</span>
                  {log.fromStatus && <p>来源：{statusLabels[log.fromStatus] ?? log.fromStatus}</p>}
                  {log.errorType && <p>错误类型：{log.errorType}</p>}
                  {log.message && <p>{log.message}</p>}
                </div>
              </div>
            )) : <div className="web-empty-state">暂无状态流转记录</div>}
          </div>
        </aside>
      </section>

      <section className="web-info-grid">
        <InfoItem label="更新时间" value={detail.updatedAt} />
        <InfoItem label="错误类型" value={detail.errorType ?? "-"} />
        <InfoItem label="错误信息" value={detail.errorMessage ?? "-"} />
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="web-summary-card">
      <Typography.Text className="web-kicker">{label}</Typography.Text>
      <strong>{value}</strong>
    </Card>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="web-info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function getStatusTone(status: string) {
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
