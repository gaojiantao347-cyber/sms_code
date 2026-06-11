import { Alert, App, Button, Card, Checkbox, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminCatalogService } from "../../services/adminCatalogService";
import { adminRedeemCodeService } from "../../services/adminRedeemCodeService";
import type { CatalogEntry } from "../../types/catalog";
import type { AdminRedeemCodeCreateInput, AdminRedeemCodeCreateResult, AdminRedeemCodeItem, AdminRedeemCodeListResult, AdminRedeemCodeQuery, AdminRedeemCodeUpdateInput } from "../../types/redeem";
import { SmsMode } from "../../types/redeem";
import { getErrorMessage } from "../../utils/errorMessage";
import { useAdminAuth } from "./adminAuth";

const pageSize = 20;

const smsModeLabels: Record<string, string> = {
  [SmsMode.ShortTerm]: "短期租号",
  [SmsMode.LongTerm]: "长期租号"
};

type RedeemCodeFormState = {
  enabled: boolean;
  platformCode: string;
  smsMode: SmsMode;
  countryCode: string;
  maxUseCount: number;
  expiresAt?: string;
};

type RedeemCodeFilterState = {
  codeKeyword?: string;
  platformCode?: string;
  smsMode?: string;
  enabled?: string;
};

const emptyForm: RedeemCodeFormState = {
  enabled: true,
  platformCode: "",
  smsMode: SmsMode.ShortTerm,
  countryCode: "",
  maxUseCount: 1,
  expiresAt: ""
};

export function RedeemCodeAdminPage() {
  const { message, modal } = App.useApp();
  const { adminToken } = useAdminAuth();
  const [filterForm] = Form.useForm<RedeemCodeFilterState>();
  const [editForm] = Form.useForm<RedeemCodeFormState>();
  const [filters, setFilters] = useState<RedeemCodeFilterState>({});
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminRedeemCodeListResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [platformOptions, setPlatformOptions] = useState<CatalogEntry[]>([]);
  const [countryOptions, setCountryOptions] = useState<CatalogEntry[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [createdCode, setCreatedCode] = useState("");
  const [showCreatedCode, setShowCreatedCode] = useState(true);

  const query = useMemo<AdminRedeemCodeQuery>(() => ({
    codeKeyword: filters.codeKeyword?.trim() || undefined,
    platformCode: filters.platformCode?.trim() || undefined,
    smsMode: (filters.smsMode as SmsMode) || undefined,
    enabled: filters.enabled === undefined || filters.enabled === "" ? undefined : filters.enabled === "true",
    page,
    pageSize
  }), [filters, page]);

  const loadRedeemCodes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminRedeemCodeService.list<AdminRedeemCodeListResult>(toQueryString(query), adminToken);
      setResult(data);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [adminToken, query]);

  const loadCatalog = useCallback(async () => {
    try {
      const [platforms, countries] = await Promise.all([
        adminCatalogService.platforms<CatalogEntry[]>(true, adminToken),
        adminCatalogService.countries<CatalogEntry[]>(true, adminToken)
      ]);
      setPlatformOptions(platforms);
      setCountryOptions(countries);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }, [adminToken]);

  useEffect(() => {
    editForm.setFieldsValue(emptyForm);
  }, [editForm]);

  useEffect(() => {
    void loadRedeemCodes();
  }, [loadRedeemCodes]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  function handleFilterSubmit(values: RedeemCodeFilterState) {
    setFilters(values);
    setPage(1);
  }

  function handleResetFilters() {
    filterForm.resetFields();
    setFilters({});
    setPage(1);
  }

  async function handleSave(values: RedeemCodeFormState) {
    setSaving(true);
    try {
      const saved = editingId
        ? await adminRedeemCodeService.update<AdminRedeemCodeItem>(editingId, toUpdateInput(values, platformOptions), adminToken)
        : await adminRedeemCodeService.create<AdminRedeemCodeCreateResult>(toCreateInput(values, platformOptions), adminToken);
      editForm.setFieldsValue(emptyForm);
      setEditingId("");
      setFormOpen(false);
      setCreatedCode(editingId ? "" : saved.code);
      setShowCreatedCode(true);
      setErrorMessage("");
      void message.success(editingId ? `兑换码已更新：${saved.codeMasked}` : `兑换码已创建：${saved.codeMasked}`);
      await loadRedeemCodes();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function handleDisable(item: AdminRedeemCodeItem) {
    modal.confirm({
      title: "确认禁用兑换码？",
      content: `兑换码 ${item.codeMasked} 禁用后将不能继续使用。`,
      okText: "确认禁用",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        setSaving(true);
        try {
          await adminRedeemCodeService.disable<AdminRedeemCodeItem>(item.id, adminToken);
          setCreatedCode("");
          setErrorMessage("");
          void message.success(`兑换码已禁用：${item.codeMasked}`);
          await loadRedeemCodes();
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
        } finally {
          setSaving(false);
        }
      }
    });
  }

  function startCreate() {
    setEditingId("");
    setCreatedCode("");
    editForm.setFieldsValue(emptyForm);
    setFormOpen(true);
  }

  function startEdit(item: AdminRedeemCodeItem) {
    setEditingId(item.id);
    setCreatedCode("");
    setFormOpen(true);
    editForm.setFieldsValue({
      enabled: item.enabled,
      platformCode: item.platform.code,
      smsMode: item.smsMode,
      countryCode: item.countryCode,
      maxUseCount: item.maxUseCount,
      expiresAt: toDateTimeLocalValue(item.expiresAt)
    });
  }

  function closeForm() {
    setEditingId("");
    setFormOpen(false);
    editForm.setFieldsValue(emptyForm);
  }

  async function copyCode(code: string | null) {
    if (!code) {
      setErrorMessage("历史兑换码没有明文，无法复制");
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      void message.success("兑换码已复制");
      setErrorMessage("");
    } catch {
      setErrorMessage("复制失败，请手动复制兑换码");
    }
  }

  const currentPage = result?.page ?? page;

  const columns: ColumnsType<AdminRedeemCodeItem> = [
    {
      title: "兑换码",
      dataIndex: "code",
      fixed: "left",
      width: 190,
      render: (_, item) => <span className="mono-text">{item.code ?? item.codeMasked}</span>
    },
    { title: "平台", dataIndex: "platform", width: 180, render: (_, item) => `${item.platform.name}（${item.platform.code}）` },
    { title: "国家", dataIndex: "countryCode", width: 120, render: (value: string) => <span className="mono-text">{value}</span> },
    { title: "类型", dataIndex: "smsMode", width: 110, render: (value: string) => smsModeLabels[value] ?? value },
    { title: "次数", key: "usage", width: 100, render: (_, item) => `${item.usedCount} / ${item.maxUseCount}` },
    { title: "状态", dataIndex: "enabled", width: 90, render: (enabled: boolean) => <Tag color={enabled ? "success" : "default"}>{enabled ? "启用" : "禁用"}</Tag> },
    { title: "过期时间", dataIndex: "expiresAt", width: 190, render: (value: string | null) => value ?? "-" },
    { title: "创建时间", dataIndex: "createdAt", width: 190 },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 140,
      render: (_, item) => (
        <Space size={4}>
          <Button type="link" size="small" disabled={!item.code} onClick={() => void copyCode(item.code)}>复制</Button>
          <Button type="link" size="small" onClick={() => startEdit(item)}>编辑</Button>
          <Button type="link" size="small" danger disabled={!item.enabled || saving} onClick={() => handleDisable(item)}>禁用</Button>
        </Space>
      )
    }
  ];

  return (
    <div className="page-stack">
      <Card className="page-hero">
        <Typography.Title level={2} style={{ marginBottom: 0 }}>兑换码管理</Typography.Title>
      </Card>

      <Card title="筛选查询" className="toolbar-card">
        <Form form={filterForm} layout="vertical" onFinish={handleFilterSubmit}>
          <div className="redeem-admin-filter-grid">
            <Form.Item label="兑换码关键字" name="codeKeyword"><Input allowClear style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="目标平台" name="platformCode">
              <Input allowClear placeholder="输入平台编码" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="接码类型" name="smsMode">
              <Select allowClear placeholder="全部" style={{ width: "100%" }} options={[
                { value: SmsMode.ShortTerm, label: "短期租号" },
                { value: SmsMode.LongTerm, label: "长期租号" }
              ]} />
            </Form.Item>
            <Form.Item label="启用状态" name="enabled">
              <Select allowClear placeholder="全部" style={{ width: "100%" }} options={[
                { value: "true", label: "启用" },
                { value: "false", label: "禁用" }
              ]} />
            </Form.Item>
            <Form.Item className="redeem-admin-actions">
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>查询</Button>
                <Button onClick={handleResetFilters} disabled={loading}>重置</Button>
              </Space>
            </Form.Item>
          </div>
        </Form>
      </Card>

      {errorMessage && <Alert message={errorMessage} type="error" showIcon />}

      <Modal
        title={editingId ? "更新兑换码" : "创建兑换码"}
        open={formOpen}
        onCancel={closeForm}
        footer={null}
        width={760}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleSave} initialValues={emptyForm}>
          <div className="redeem-admin-form-grid">
            <Form.Item label="目标平台" name="platformCode" rules={[{ required: true, message: "请选择目标平台" }]}>
              <Select
                showSearch
                placeholder="请选择目标平台"
                style={{ width: "100%" }}
                optionFilterProp="label"
                options={platformOptions.map((platform) => ({ value: platform.code, label: `${platform.name}（${platform.code}）` }))}
              />
            </Form.Item>
            <Form.Item label="国家或地区" name="countryCode" rules={[{ required: true, message: "请选择国家或地区" }]}>
              <Select
                showSearch
                placeholder="请选择国家或地区"
                style={{ width: "100%" }}
                optionFilterProp="label"
                options={countryOptions.map((country) => ({ value: country.code, label: `${country.name}（${country.code}）` }))}
              />
            </Form.Item>
            <Form.Item label="接码类型" name="smsMode" rules={[{ required: true }]}>
              <Select style={{ width: "100%" }} options={[
                { value: SmsMode.ShortTerm, label: "短期租号" },
                { value: SmsMode.LongTerm, label: "长期租号" }
              ]} />
            </Form.Item>
            <Form.Item label="最大使用次数" name="maxUseCount" rules={[{ required: true, message: "请输入最大使用次数" }]}>
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="过期时间" name="expiresAt"><Input type="datetime-local" style={{ width: "100%" }} /></Form.Item>
            <Form.Item label="状态" name="enabled" valuePropName="checked"><Checkbox>启用</Checkbox></Form.Item>
          </div>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>{editingId ? "保存更新" : "创建"}</Button>
            <Button onClick={closeForm} disabled={saving}>取消</Button>
          </Space>
        </Form>
      </Modal>
      {createdCode && (
        <Card className="form-card" title="完整兑换码">
          <Space direction="vertical" size={12}>
            <Typography.Text className="code-value">{showCreatedCode ? createdCode : "••••-••••-••••-••••"}</Typography.Text>
            <Space>
              <Button onClick={() => setShowCreatedCode(!showCreatedCode)}>{showCreatedCode ? "隐藏" : "显示"}</Button>
              <Button type="primary" onClick={() => void copyCode(createdCode)}>复制</Button>
            </Space>
          </Space>
        </Card>
      )}

      <Card className="data-card" title="兑换码列表" extra={<Button type="primary" onClick={startCreate}>创建兑换码</Button>}>
        <Table<AdminRedeemCodeItem>
          rowKey="id"
          columns={columns}
          dataSource={result?.items ?? []}
          loading={loading}
          scroll={{ x: 1400 }}
          pagination={{
            current: currentPage,
            pageSize,
            total: result?.total ?? 0,
            showSizeChanger: false,
            showTotal: (total) => `共 ${total} 条`,
            onChange: setPage
          }}
        />
      </Card>
    </div>
  );
}

function toQueryString(query: AdminRedeemCodeQuery): string {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const text = params.toString();
  return text ? `?${text}` : "";
}

function toCreateInput(form: RedeemCodeFormState, platformOptions: CatalogEntry[]): AdminRedeemCodeCreateInput {
  const platformCode = form.platformCode.trim();
  const platform = platformOptions.find((item) => item.code === platformCode);

  return {
    enabled: form.enabled,
    platformCode,
    platformName: platform?.name ?? platformCode,
    smsMode: form.smsMode,
    countryCode: form.countryCode.trim(),
    maxUseCount: form.maxUseCount,
    expiresAt: toIsoDateTime(form.expiresAt)
  };
}

function toUpdateInput(form: RedeemCodeFormState, platformOptions: CatalogEntry[]): AdminRedeemCodeUpdateInput {
  return toCreateInput(form, platformOptions);
}

function toIsoDateTime(value: string | undefined): string | null {
  const text = value?.trim() ?? "";
  if (!text) {
    return null;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function toDateTimeLocalValue(value: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffsetMs).toISOString().slice(0, 16);
}
