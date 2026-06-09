import { Alert, Button, Card, Result, Space, Spin, Typography, message } from "antd";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { smsTaskService } from "../services/smsTaskService";
import { SmsTaskStatus, terminalSmsTaskStatuses, type SmsTaskDetail } from "../types/smsTask";
import { getErrorMessage } from "../utils/errorMessage";
import { getUserStyleClass } from "./userStyle";

const pollingIntervalMs = 4000;

const statusLabels: Record<SmsTaskStatus, string> = {
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
  short_term: "短期租号",
  long_term: "长期租号"
};

function canStopPolling(task: SmsTaskDetail) {
  return task.status === SmsTaskStatus.CodeReceived || terminalSmsTaskStatuses.has(task.status);
}

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function TaskPage() {
  const { taskId } = useParams();
  const [task, setTask] = useState<SmsTaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [messageApi, contextHolder] = message.useMessage();

  const shouldPoll = useMemo(() => task?.status === SmsTaskStatus.WaitingCode, [task?.status]);

  const loadTask = useCallback(async () => {
    if (!taskId) {
      setErrorMessage("任务 ID 不存在");
      setLoading(false);
      return;
    }

    try {
      const nextTask = await smsTaskService.getTask(taskId);
      setTask(nextTask);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void loadTask();
  }, [loadTask]);

  useEffect(() => {
    if (!shouldPoll) {
      return;
    }

    const timer = window.setInterval(async () => {
      if (!taskId) {
        return;
      }

      try {
        const nextTask = await smsTaskService.getTask(taskId);
        setTask(nextTask);
        if (canStopPolling(nextTask)) {
          window.clearInterval(timer);
        }
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      }
    }, pollingIntervalMs);

    return () => window.clearInterval(timer);
  }, [shouldPoll, taskId]);

  async function runAction(action: () => Promise<unknown>) {
    setActionLoading(true);
    setErrorMessage("");

    try {
      await action();
      await loadTask();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCopy(value: string, label: string) {
    try {
      await copyText(value);
      void messageApi.success(`${label}已复制`);
    } catch {
      void messageApi.error("复制失败，请手动复制");
    }
  }

  if (loading) {
    return (
      <div className={`web-task-page ${getUserStyleClass()}`}>
        <div className="web-loading-panel"><Spin tip="正在加载任务..." /></div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className={`web-task-page ${getUserStyleClass()}`}>
        {contextHolder}
        <Result
          status="warning"
          title="任务不存在或加载失败"
          subTitle={errorMessage || "请返回重新兑换。"}
          extra={<Button type="primary"><Link to="/redeem">返回重新兑换</Link></Button>}
        />
      </div>
    );
  }

  const statusTone = getStatusTone(task.status);

  return (
    <div className={`web-task-page ${getUserStyleClass()}`}>
      {contextHolder}
      <section className="web-task-hero">
        <div>
          <Link className="web-text-link" to="/redeem">返回兑换</Link>
          <Typography.Text className="web-kicker">Current Task</Typography.Text>
          <Typography.Title level={1}>{getTaskHeadline(task)}</Typography.Title>
          <Typography.Paragraph>任务 ID：<span className="mono-text">{task.taskId}</span></Typography.Paragraph>
        </div>
        <span className={`status-pill status-${statusTone}`}>{statusLabels[task.status]}</span>
      </section>

      {(errorMessage || task.errorMessage) && (
        <div className="web-alert-stack">
          {errorMessage && <Alert message={errorMessage} type="error" showIcon />}
          {task.errorMessage && <Alert message={task.errorMessage} type="error" showIcon />}
        </div>
      )}

      <section className="web-task-workspace">
        <div className="web-value-grid">
          <ValueBlock
            label="手机号"
            value={task.phoneNumber ?? "等待获取"}
            action={task.phoneNumber ? <Button onClick={() => void handleCopy(task.phoneNumber!, "手机号")}>复制</Button> : undefined}
          />
          <ValueBlock
            label="验证码"
            value={task.code ?? getCodePlaceholder(task.status)}
            highlight={Boolean(task.code)}
            action={task.code ? <Button type="primary" onClick={() => void handleCopy(task.code!, "验证码")}>复制验证码</Button> : undefined}
          />
        </div>

        <aside className="web-next-panel">
          <Typography.Text className="web-kicker">Next Action</Typography.Text>
          <Typography.Title level={3}>下一步</Typography.Title>
          <Space wrap>
            {task.status === SmsTaskStatus.NumberAcquired && (
              <Button type="primary" size="large" loading={actionLoading} onClick={() => void runAction(() => smsTaskService.waitCode(task.taskId))}>
                开始等码
              </Button>
            )}
            {(task.status === SmsTaskStatus.NumberAcquired || task.status === SmsTaskStatus.WaitingCode) && (
              <Button danger size="large" loading={actionLoading} onClick={() => void runAction(() => smsTaskService.cancel(task.taskId, "user_cancelled"))}>
                取消任务
              </Button>
            )}
            {task.status === SmsTaskStatus.CodeReceived && (
              <Button type="primary" size="large" loading={actionLoading} onClick={() => void runAction(() => smsTaskService.complete(task.taskId))}>
                完成任务
              </Button>
            )}
            {terminalSmsTaskStatuses.has(task.status) && <Button size="large"><Link to="/redeem">继续兑换</Link></Button>}
            <Button size="large"><Link to="/history">查看历史</Link></Button>
          </Space>
        </aside>
      </section>

      <section className="web-info-grid">
        <InfoItem label="目标平台" value={`${task.platform.name} / ${task.platform.code}`} />
        <InfoItem label="接码类型" value={smsModeLabels[task.smsMode] ?? task.smsMode} />
        <InfoItem label="创建时间" value={task.createdAt} />
        <InfoItem label="更新时间" value={task.updatedAt} />
      </section>
    </div>
  );
}

function ValueBlock({ label, value, action, highlight = false }: { label: string; value: string; action?: ReactNode; highlight?: boolean }) {
  return (
    <Card className={`web-value-card ${highlight ? "is-highlight" : ""}`}>
      <Typography.Text className="web-kicker">{label}</Typography.Text>
      <div className="web-value-row">
        <strong>{value}</strong>
        {action}
      </div>
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

function getTaskHeadline(task: SmsTaskDetail) {
  if (task.code) {
    return "验证码已到达";
  }

  if (task.phoneNumber && task.status === SmsTaskStatus.WaitingCode) {
    return "号码已就绪，正在等码";
  }

  if (task.phoneNumber) {
    return "号码已获取";
  }

  return "正在准备号码";
}

function getCodePlaceholder(status: SmsTaskStatus) {
  if (status === SmsTaskStatus.WaitingCode) {
    return "等待短信进入";
  }

  if (status === SmsTaskStatus.NumberAcquired) {
    return "点击开始等码";
  }

  return "暂无验证码";
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
