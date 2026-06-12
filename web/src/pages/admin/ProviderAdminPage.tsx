import { Alert, App, Button, Card, Checkbox, Form, Input, Modal, Select, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminProviderService } from "../../services/adminProviderService";
import { adminCatalogService } from "../../services/adminCatalogService";
import type { AdminProviderAdapterOption, AdminProviderCreateInput, AdminProviderItem, AdminProviderListResult, AdminProviderQuery, AdminProviderUpdateInput, ProviderCapability as ProviderCapabilityValue } from "../../types/provider";
import type { CatalogSyncResult } from "../../types/catalog";
import { ProviderCapability } from "../../types/provider";
import { getErrorMessage } from "../../utils/errorMessage";
import { useAdminAuth } from "./adminAuth";

const pageSize = 20;

const capabilityLabels: Record<ProviderCapabilityValue, string> = {
  [ProviderCapability.ShortTermRental]: "短期租号",
  [ProviderCapability.LongTermRental]: "长期租号",
  [ProviderCapability.WaitCode]: "等待验证码",
  [ProviderCapability.Cancel]: "取消号码"
};

const capabilityOptions = Object.values(ProviderCapability);

type ProviderFormState = {
  name: string;
  enabled: boolean;
  secret?: string;
  capabilities: ProviderCapabilityValue[];
};

type ProviderFilterState = {
  nameKeyword?: string;
  enabled?: string;
};

const emptyForm: ProviderFormState = {
  name: "",
  enabled: true,
  secret: "",
  capabilities: [ProviderCapability.WaitCode]
};

export function ProviderAdminPage() {
  const { message, modal } = App.useApp();
  const { adminToken } = useAdminAuth();
  const [filterForm] = Form.useForm<ProviderFilterState>();
  const [editForm] = Form.useForm<ProviderFormState>();
  const [filters, setFilters] = useState<ProviderFilterState>({});
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminProviderListResult | null>(null);
  const [adapterOptions, setAdapterOptions] = useState<AdminProviderAdapterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [syncingId, setSyncingId] = useState("");

  const query = useMemo<AdminProviderQuery>(() => ({
    nameKeyword: filters.nameKeyword?.trim() || undefined,
    enabled: filters.enabled === undefined || filters.enabled === "" ? undefined : filters.enabled === "true",
    page,
    pageSize
  }), [filters, page]);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminProviderService.list<AdminProviderListResult>(toQueryString(query), adminToken);
      setResult(data);
      setErrorMessage("");
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [adminToken, query]);

  const loadAdapterOptions = useCallback(async () => {
    try {
      const data = await adminProviderService.listAdapterOptions<AdminProviderAdapterOption[]>(adminToken);
      setAdapterOptions(data);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  }, [adminToken]);

  useEffect(() => {
    editForm.setFieldsValue(emptyForm);
  }, [editForm]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  useEffect(() => {
    void loadAdapterOptions();
  }, [loadAdapterOptions]);

  function handleFilterSubmit(values: ProviderFilterState) {
    setFilters(values);
    setPage(1);
  }

  function handleResetFilters() {
    filterForm.resetFields();
    setFilters({});
    setPage(1);
  }

  async function handleSave(values: ProviderFormState) {
    setSaving(true);
    try {
      const saved = editingId
        ? await adminProviderService.update<AdminProviderItem>(editingId, toUpdateInput(values), adminToken)
        : await adminProviderService.create<AdminProviderItem>(toCreateInput(values), adminToken);
      editForm.setFieldsValue(emptyForm);
      setEditingId("");
      setFormOpen(false);
      setErrorMessage("");
      void message.success(editingId ? `Provider 已更新：${saved.name}` : `Provider 已创建：${saved.name}`);
      await loadProviders();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  function handleDisable(item: AdminProviderItem) {
    modal.confirm({
      title: "确认禁用 Provider？",
      content: `Provider ${item.name} 禁用后将不能继续分配给新兑换码。`,
      okText: "确认禁用",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        setSaving(true);
        try {
          await adminProviderService.disable<AdminProviderItem>(item.id, adminToken);
          setErrorMessage("");
          void message.success(`Provider 已禁用：${item.name}`);
          await loadProviders();
        } catch (error) {
          setErrorMessage(getErrorMessage(error));
        } finally {
          setSaving(false);
        }
      }
    });
  }

  async function handleSync(item: AdminProviderItem) {
    setSyncingId(item.id);
    try {
      const data = await adminCatalogService.sync<CatalogSyncResult>(item.id, adminToken);
      setErrorMessage("");
      void message.success(`目录已同步：平台 ${data.platforms} / 国家 ${data.countries}`);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setSyncingId("");
    }
  }

  function startCreate() {
    setEditingId("");
    editForm.setFieldsValue(emptyForm);
    setFormOpen(true);
  }

  function startEdit(item: AdminProviderItem) {
    setEditingId(item.id);
    setFormOpen(true);
    editForm.setFieldsValue({
      name: item.name,
      enabled: item.enabled,
      secret: "",
      capabilities: item.capabilities
        .filter((capability) => capability.enabled)
        .map((capability) => capability.capabilityCode)
    });
  }

  function closeForm() {
    setEditingId("");
    setFormOpen(false);
    editForm.setFieldsValue(emptyForm);
  }

  const currentPage = result?.page ?? page;
  const adapterOptionMap = useMemo(
    () => new Map(adapterOptions.map((option) => [option.code, option])),
    [adapterOptions]
  );

  const columns: ColumnsType<AdminProviderItem> = [
    { title: "名称", dataIndex: "name", fixed: "left", width: 180, render: (value: string) => <Typography.Text strong>{value}</Typography.Text> },
    { title: "状态", dataIndex: "enabled", width: 90, render: (enabled: boolean) => <Tag color={enabled ? "success" : "default"}>{enabled ? "启用" : "禁用"}</Tag> },
    { title: "Secret", dataIndex: "secretConfigured", width: 110, render: (configured: boolean) => <Tag color={configured ? "processing" : "warning"}>{configured ? "已配置" : "未配置"}</Tag> },
    { title: "能力", dataIndex: "capabilities", width: 300, render: (_, item) => formatCapabilities(item) },
    { title: "创建时间", dataIndex: "createdAt", width: 190 },
    {
      title: "操作",
      key: "action",
      fixed: "right",
      width: 210,
      render: (_, item) => (
        <Space size={4}>
          <Button type="link" size="small" onClick={() => startEdit(item)}>编辑</Button>
          <Button type="link" size="small" disabled={!item.enabled || !adapterOptionMap.get(item.name)?.supportsCatalogSync || syncingId === item.id} loading={syncingId === item.id} onClick={() => handleSync(item)}>同步目录</Button>
          <Button type="link" size="small" danger disabled={!item.enabled || saving} onClick={() => handleDisable(item)}>禁用</Button>
        </Space>
      )
    }
  ];

  return (
    <div className="page-stack">
      <Card className="page-hero">
        <Typography.Title level={2} style={{ marginBottom: 0 }}>Provider 配置</Typography.Title>
      </Card>

      <Card title="筛选查询" className="toolbar-card">
        <Form form={filterForm} layout="vertical" onFinish={handleFilterSubmit}>
          <Space wrap align="end" size={16}>
            <Form.Item label="Provider 名称关键字" name="nameKeyword"><Input allowClear style={{ width: 240 }} /></Form.Item>
            <Form.Item label="启用状态" name="enabled">
              <Select allowClear placeholder="全部" style={{ width: 140 }} options={[
                { value: "true", label: "启用" },
                { value: "false", label: "禁用" }
              ]} />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={loading}>查询</Button>
                <Button onClick={handleResetFilters} disabled={loading}>重置</Button>
              </Space>
            </Form.Item>
          </Space>
        </Form>
      </Card>

      {errorMessage && <Alert message={errorMessage} type="error" showIcon />}

      <Modal
        title={editingId ? "更新 Provider" : "创建 Provider"}
        open={formOpen}
        onCancel={closeForm}
        footer={null}
        destroyOnHidden
      >
        <Form form={editForm} layout="vertical" onFinish={handleSave} initialValues={emptyForm}>
          <Form.Item label="Provider 名称" name="name" rules={[{ required: true, message: "请选择 Provider 名称" }]}> 
            <Select
              options={adapterOptions.map((option) => ({
                value: option.code,
                label: option.code
              }))}
            />
          </Form.Item>
          <Form.Item label="Secret" name="secret">
            <Input.Password placeholder={editingId ? "留空则保留旧 secret" : "Provider secret"} />
          </Form.Item>
          <Form.Item label="状态" name="enabled" valuePropName="checked"><Checkbox>启用</Checkbox></Form.Item>
          <Form.Item label="Provider 能力" name="capabilities" rules={[{ required: true, message: "请选择至少一个能力" }]}> 
            <Checkbox.Group options={capabilityOptions.map((capabilityCode) => ({ value: capabilityCode, label: capabilityLabels[capabilityCode] }))} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={saving}>{editingId ? "保存更新" : "创建"}</Button>
            <Button onClick={closeForm} disabled={saving}>取消</Button>
          </Space>
        </Form>
      </Modal>

      <Card className="data-card" title="Provider 列表" extra={<Button type="primary" onClick={startCreate}>创建 Provider</Button>}>
        <Table<AdminProviderItem>
          rowKey="id"
          columns={columns}
          dataSource={result?.items ?? []}
          loading={loading}
          scroll={{ x: 1330 }}
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

function toQueryString(query: AdminProviderQuery): string {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      params.set(key, String(value));
    }
  });

  const text = params.toString();
  return text ? `?${text}` : "";
}

function toCreateInput(form: ProviderFormState): AdminProviderCreateInput {
  return {
    name: form.name,
    enabled: form.enabled,
    secret: emptyToUndefined(form.secret),
    capabilities: capabilityOptions.map((capabilityCode) => ({ capabilityCode, enabled: form.capabilities.includes(capabilityCode) }))
  };
}

function toUpdateInput(form: ProviderFormState): AdminProviderUpdateInput {
  return toCreateInput(form);
}

function formatCapabilities(item: AdminProviderItem) {
  const enabledCapabilities = item.capabilities
    .filter((capability) => capability.enabled)
    .map((capability) => capabilityLabels[capability.capabilityCode] ?? capability.capabilityCode);

  if (!enabledCapabilities.length) {
    return "-";
  }

  return <Space wrap size={4}>{enabledCapabilities.map((capability) => <Tag key={capability}>{capability}</Tag>)}</Space>;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const text = value?.trim() ?? "";
  return text || undefined;
}
