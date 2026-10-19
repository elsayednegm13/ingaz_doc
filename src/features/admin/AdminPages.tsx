import { PERMISSIONS } from "@shared/permissions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, FileText, History, ShieldCheck, SlidersHorizontal, UserCheck, UserPlus, Users as UsersIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState, Ltr, PageHeader, SectionCard, StatCard } from "@/components/ui/chrome";
import { Field, Input, Select } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatWhen, useCopy } from "@/lib/copy";
import { notifyError, notifySuccess } from "@/lib/notify";

export function UsersPage() {
  const { tx, ar, i18n } = useCopy();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api<Array<Record<string, string>>>("/api/v1/users")).data,
  });
  const roles = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await api<Array<{ id: string; key: string; name_en: string; name_ar: string }>>("/api/v1/roles")).data,
  });
  const rows = query.data ?? [];
  const activeCount = rows.filter((user) => user.is_active === "1" || Number(user.is_active) === 1).length;
  return (
    <div className="space-y-4" data-users={query.isLoading ? "loading" : "ready"}>
      <PageHeader title={tx("users", "Users")} subtitle={tx("usersHint", "Provision accounts and shape roles; every change is written to the audit log.")} />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={tx("users", "Users")} value={rows.length} icon={<UsersIcon className="h-5 w-5" />} tone="blue" />
        <StatCard label={tx("active", "Active")} value={activeCount} icon={<UserCheck className="h-5 w-5" />} tone="green" />
        <StatCard label={tx("roles", "Roles")} value={(roles.data ?? []).length} icon={<ShieldCheck className="h-5 w-5" />} tone="teal" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <SectionCard title={tx("provisionUser", "Provision user")} icon={<UserPlus className="h-4 w-4" />}>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              try {
                await api("/api/v1/users", {
                  method: "POST",
                  body: JSON.stringify({
                    name: form.get("name"),
                    email: form.get("email"),
                    password: form.get("password"),
                    roleKeys: [form.get("role")],
                  }),
                });
                notifySuccess(tx("userProvisioned", "User provisioned"), String(form.get("email")));
                await client.invalidateQueries({ queryKey: ["users"] });
              } catch (error) {
                notifyError(error);
              }
            }}
          >
            <Field label={tx("name", "Name")}><Input name="name" required /></Field>
            <Field label={tx("email", "Email")}><Input name="email" type="email" required dir="ltr" /></Field>
            <Field label={tx("initialPassword", "Initial password")}><Input name="password" type="password" minLength={12} required /></Field>
            <Field label={tx("role", "Role")}>
              <Select name="role" defaultValue="export_officer">
                {(roles.data ?? [{ key: "export_officer", name_en: "Export officer", name_ar: "مسؤول تصدير", id: "role-officer" }]).map((role) => (
                  <option key={role.key} value={role.key}>{(ar && role.name_ar) ? role.name_ar : role.name_en}</option>
                ))}
              </Select>
            </Field>
            <div className="flex justify-end"><Button type="submit">{tx("provisionUser", "Provision user")}</Button></div>
          </form>
        </SectionCard>

        <SectionCard title={tx("customRole", "Custom role")} icon={<ShieldCheck className="h-4 w-4" />}>
          <form
            className="grid gap-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const permissions = form.getAll("permissions").map(String);
              if (!permissions.length) return;
              try {
                await api("/api/v1/roles", {
                  method: "POST",
                  body: JSON.stringify({
                    key: form.get("key"),
                    nameEn: form.get("nameEn"),
                    nameAr: form.get("nameAr") || form.get("nameEn"),
                    permissions,
                  }),
                });
                notifySuccess(tx("roleCreated", "Role created"), String(form.get("key")));
                await client.invalidateQueries({ queryKey: ["roles"] });
              } catch (error) {
                notifyError(error);
              }
            }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label={tx("roleKey", "Role key")}><Input name="key" required dir="ltr" /></Field>
              <Field label={tx("name", "Name")}><Input name="nameEn" required /></Field>
              <Field label={tx("arabicName", "Arabic name")}><Input name="nameAr" /></Field>
            </div>
            <fieldset>
              <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">{tx("permissions", "Permissions")}</legend>
              <div className="grid max-h-64 gap-2 overflow-y-auto rounded-xl border border-line bg-paper/40 p-3 sm:grid-cols-2">
                {PERMISSIONS.map((key) => (
                  <label key={key} className="flex items-start gap-2 text-sm text-ink">
                    <input type="checkbox" name="permissions" value={key} className="mt-1 accent-[var(--accent)]" />
                    <span>{tx(`perm.${key}`, key)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="flex justify-end"><Button type="submit" variant="outline">{tx("createRole", "Create role")}</Button></div>
          </form>
        </SectionCard>
      </div>

      <SectionCard title={tx("team", "Team")} icon={<UsersIcon className="h-4 w-4" />} action={<span className="text-xs text-ink-muted"><Ltr>{rows.length}</Ltr></span>}>
        {rows.length === 0 ? (
          <EmptyState>{tx("noUsers", "No users yet.")}</EmptyState>
        ) : (
          <ul className="grid gap-2">
            {rows.map((user) => {
              const isActive = user.is_active === "1" || Number(user.is_active) === 1;
              return (
                <li key={user.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-paper/40 px-3 py-2.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink text-xs font-semibold text-white">
                    {initialsOf(user.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{user.name}</span>
                    <span className="block truncate text-xs text-ink-muted"><Ltr>{user.email}</Ltr></span>
                  </span>
                  <span className="flex flex-wrap gap-1.5">
                    {String(user.roles || "")
                      .split(/[,·|]/)
                      .map((role) => role.trim())
                      .filter(Boolean)
                      .map((role) => (
                        <span key={role} className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                          {tx(`role.${role}`, role)}
                        </span>
                      ))}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${isActive ? "bg-ok/10 text-ok" : "bg-danger/10 text-danger"}`}>
                    {isActive ? tx("active", "Active") : tx("disabled", "Disabled")}
                  </span>
                  {user.created_at ? (
                    <span className="text-[11px] text-ink-muted"><Ltr>{formatWhen(user.created_at, i18n.language)}</Ltr></span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

export function SettingsPage() {
  const { tx, ruleName, fail } = useCopy();
  const client = useQueryClient();
  const [ruleMessage, setRuleMessage] = useState<string | null>(null);
  const fields = useQuery({
    queryKey: ["custom-fields"],
    queryFn: async () => (await api<Array<Record<string, string>>>("/api/v1/custom-fields")).data,
  });
  const rules = useQuery({
    queryKey: ["rules"],
    queryFn: async () => (await api<Array<Record<string, string>>>("/api/v1/reminder-rules")).data,
  });
  const templates = useQuery({
    queryKey: ["templates"],
    queryFn: async () => (await api<Array<Record<string, unknown>>>("/api/v1/document-templates")).data,
    refetchInterval: false,
  });
  return (
    <div className="space-y-4" data-settings="ready">
      <PageHeader title={tx("settings", "Settings")} subtitle={tx("settingsHint", "Custom fields, reminder rules and document templates are versioned; a stale save is refused instead of overwriting.")} />      <SectionCard title={tx("customFields", "Custom fields")} icon={<SlidersHorizontal className="h-4 w-4" />}>
        <form
          className="grid gap-2 md:grid-cols-2"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const options = String(form.get("options") || "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
            try {
              await api("/api/v1/custom-fields", {
                method: "POST",
                body: JSON.stringify({
                  targetEntity: form.get("targetEntity"),
                  fieldKey: form.get("fieldKey"),
                  labelEn: form.get("labelEn"),
                  labelAr: form.get("labelAr"),
                  dataType: form.get("dataType"),
                  required: form.get("required") === "1",
                  sensitive: form.get("sensitive") === "1",
                  options,
                }),
              });
              notifySuccess(tx("fieldSaved", "Custom field saved"));
              await client.invalidateQueries({ queryKey: ["custom-fields"] });
            } catch (error) {
              notifyError(error);
            }
          }}
        >
          <Field label={tx("target", "Target")}>
            <Select name="targetEntity" defaultValue="CUSTOMER">
              <option value="CUSTOMER">{tx("entity.CUSTOMER", "Customer")}</option>
              <option value="EXPORT_CASE">{tx("entity.EXPORT_CASE", "Export operation")}</option>
              <option value="INVOICE">{tx("entity.INVOICE", "Invoice")}</option>
              <option value="BOOKING">{tx("entity.BOOKING", "Booking")}</option>
              <option value="CONTAINER">{tx("entity.CONTAINER", "Container")}</option>
            </Select>
          </Field>
          <Field label={tx("key", "Key")}><Input name="fieldKey" required dir="ltr" /></Field>
          <Field label={tx("labelEn", "Label EN")}><Input name="labelEn" required /></Field>
          <Field label={tx("labelAr", "Label AR")}><Input name="labelAr" required /></Field>
          <Field label={tx("type", "Type")}>
            <Select name="dataType" defaultValue="TEXT">
              <option value="TEXT">{tx("fieldType.TEXT", "Text")}</option>
              <option value="NUMBER">{tx("fieldType.NUMBER", "Number")}</option>
              <option value="DATE">{tx("fieldType.DATE", "Date")}</option>
              <option value="BOOLEAN">{tx("fieldType.BOOLEAN", "Yes / no")}</option>
              <option value="SELECT">{tx("fieldType.SELECT", "Choice")}</option>
            </Select>
          </Field>
          <Field label={tx("fieldOptions", "Options")} hint={tx("fieldOptionsHint", "One option per line. Required for a choice field.")}><Input name="options" dir="ltr" /></Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="required" value="1" /> {tx("required", "required")}</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="sensitive" value="1" /> {tx("sensitive", "Sensitive")}</label>
          <Button type="submit">{tx("addField", "Add field")}</Button>
        </form>
        <ul className="mt-3 space-y-2 text-sm">
          {fields.data?.map((f) => (
            <li key={f.id} className="rounded-xl border border-line bg-paper/40 p-3">
              <form
                className="grid gap-2 md:grid-cols-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  try {
                    await api(`/api/v1/custom-fields/${f.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        labelEn: form.get("labelEn"),
                        labelAr: form.get("labelAr"),
                        position: Number(form.get("position") || 0),
                        required: form.get("required") === "1",
                        sensitive: form.get("sensitive") === "1",
                        active: form.get("active") === "1",
                        options: String(form.get("options") || "").split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean),
                      }),
                    });
                    notifySuccess(tx("fieldSaved", "Custom field saved"), String(f.field_key));
                    await client.invalidateQueries({ queryKey: ["custom-fields"] });
                  } catch (error) {
                    notifyError(error);
                  }
                }}
              >
                <span className="md:col-span-4 font-medium">{tx(`entity.${f.target_entity}`, String(f.target_entity))} · <Ltr>{f.field_key}</Ltr> · {tx(`fieldType.${f.data_type}`, String(f.data_type))}</span>
                <Input name="labelEn" defaultValue={f.label_en} required />
                <Input name="labelAr" defaultValue={f.label_ar} required />
                <Input name="position" type="number" min={0} defaultValue={f.position} dir="ltr" aria-label={tx("position", "Order")} />
                <Input name="options" defaultValue={f.data_type === "SELECT" ? safeOptions(f.options_json) : ""} dir="ltr" aria-label={tx("fieldOptions", "Options")} />
                <label className="flex items-center gap-2"><input type="checkbox" name="required" value="1" defaultChecked={Number(f.required) === 1} /> {tx("required", "required")}</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="sensitive" value="1" defaultChecked={Number(f.sensitive) === 1} /> {tx("sensitive", "Sensitive")}</label>
                <label className="flex items-center gap-2"><input type="checkbox" name="active" value="1" defaultChecked={Number(f.active) === 1} /> {tx("active", "active")}</label>
                <Button type="submit" size="sm" variant="outline">{tx("saveField", "Save field")}</Button>
              </form>
            </li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title={tx("reminderRules", "Reminder rules")} icon={<BellRing className="h-4 w-4" />}>
        <div data-rules={rules.isLoading ? "loading" : "ready"}>
        {ruleMessage ? <p className="mb-2 text-sm text-ink-muted" role="alert">{ruleMessage}</p> : null}
        {rules.isLoading ? <p className="text-sm text-ink-muted">{tx("loadingData", "Loading…")}</p> : null}
        <ul className="space-y-2 text-sm">
          {rules.data?.map((r) => (
            <li key={r.id} className="rounded-xl border border-line bg-paper/40 p-3">
              <form
                className="grid flex-1 gap-2 md:grid-cols-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  const repeat = String(form.get("repeatEveryDays") ?? "").trim();
                  setRuleMessage(null);
                  try {
                    await api(`/api/v1/reminder-rules/${r.id}`, {
                      method: "PATCH",
                      body: JSON.stringify({
                        offsetAmount: Number(form.get("offsetAmount")),
                        offsetDirection: form.get("offsetDirection"),
                        offsetUnit: form.get("offsetUnit"),
                        repeatEveryDays: repeat ? Number(repeat) : null,
                        repeatCap: String(form.get("repeatCap") ?? "").trim() ? Number(form.get("repeatCap")) : null,
                        enabled: form.get("enabled") === "1",
                        expected: {
                          enabled: Number(r.enabled) === 1,
                          offsetAmount: Number(r.offset_amount),
                          offsetDirection: r.offset_direction,
                          offsetUnit: r.offset_unit,
                          repeatEveryDays: r.repeat_every_days == null || r.repeat_every_days === "" ? null : Number(r.repeat_every_days),
                          repeatCap: r.repeat_cap == null || r.repeat_cap === "" ? null : Number(r.repeat_cap),
                        },
                      }),
                    });
                    notifySuccess(tx("ruleSaved", "Reminder rule saved"));
                    await client.invalidateQueries({ queryKey: ["rules"] });
                  } catch (error) {
                    setRuleMessage(fail(error));
                    await rules.refetch();
                  }
                }}
              >
                <span className="md:col-span-4 font-medium">{ruleName(r.id, r.name_en)}</span>
                <Input name="offsetAmount" type="number" defaultValue={r.offset_amount} aria-label={tx("type", "Type")} dir="ltr" />
                <Select name="offsetDirection" defaultValue={r.offset_direction}>
                  <option value="BEFORE">{tx("offset.BEFORE", "Before")}</option>
                  <option value="AFTER">{tx("offset.AFTER", "After")}</option>
                </Select>
                <Select name="offsetUnit" defaultValue={r.offset_unit}>
                  <option value="DAYS">{tx("unit.DAYS", "Days")}</option>
                  <option value="HOURS">{tx("unit.HOURS", "Hours")}</option>
                </Select>
                <Input name="repeatEveryDays" placeholder={tx("reminderOnce", "Once")} defaultValue={r.repeat_every_days ?? ""} aria-label={tx("repeatDays", "Repeat every (days)")} dir="ltr" />
                <Input name="repeatCap" defaultValue={r.repeat_cap ?? ""} aria-label={tx("repeatCap", "Repeat cap")} dir="ltr" />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="enabled" value="1" defaultChecked={Number(r.enabled) === 1} /> {tx("active", "active")}</label>
                <Button size="sm" type="submit" variant="outline">{tx("saveField", "Save field")}</Button>
              </form>
            </li>
          ))}
        </ul>
        </div>
      </SectionCard>
      <SectionCard title={tx("documentTemplates", "Document templates")} icon={<FileText className="h-4 w-4" />}>
        {templates.data?.length ? (
          <ul className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {templates.data.map((t) => (
              <li key={String(t.id)} className="rounded-xl border border-line bg-paper/40 px-3 py-2.5 text-ink">{String(t.name_en)}</li>
            ))}
          </ul>
        ) : (
          <EmptyState>{tx("noTemplates", "No document templates yet.")}</EmptyState>
        )}
      </SectionCard>
    </div>
  );
}

function safeOptions(raw?: string) {
  try {
    const parsed = JSON.parse(raw || "[]") as unknown;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").join(", ") : "";
  } catch {
    return "";
  }
}

export function ActivityPage() {
  const { tx, activity, i18n } = useCopy();
  const query = useQuery({
    queryKey: ["activity"],
    queryFn: async () => (await api<Array<Record<string, string>>>("/api/v1/activity")).data,
  });
  const rows = query.data ?? [];
  return (
    <div className="space-y-4" data-activity={query.isLoading ? "loading" : "ready"}>
      <PageHeader title={tx("activity", "Activity")} subtitle={tx("activityHint", "The audit trail: every recorded action, newest first.")} />
      {query.isLoading ? (
        <div className="grid gap-2">
          {[0, 1, 2, 3].map((key) => <div key={key} className="h-14 animate-pulse rounded-xl border border-line bg-card" />)}
        </div>
      ) : null}
      {!query.isLoading && !rows.length ? <EmptyState>{tx("noActivity", "No activity recorded yet.")}</EmptyState> : null}
      {rows.length ? (
        <SectionCard title={tx("auditTrail", "Audit trail")} icon={<History className="h-4 w-4" />} action={<span className="text-xs text-ink-muted"><Ltr>{rows.length}</Ltr></span>}>
          <ol className="relative space-y-3 ps-5">
            <span className="absolute bottom-2 start-[5px] top-2 w-px bg-line" aria-hidden />
            {rows.map((row) => (
              <li key={row.id} className="relative">
                <span className="absolute -start-5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-accent" aria-hidden />
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-paper/40 px-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{activity(row.action)}</span>
                    <span className="block text-xs text-ink-muted">
                      {tx(`entity.${row.entity_type}`, String(row.entity_type))} · <Ltr>{String(row.entity_id).slice(0, 8)}</Ltr>
                    </span>
                  </span>
                  <span className="text-[11px] text-ink-muted"><Ltr>{formatWhen(row.created_at, i18n.language)}</Ltr></span>
                </div>
              </li>
            ))}
          </ol>
        </SectionCard>
      ) : null}
    </div>
  );
}

/** Two-letter monogram for avatar tiles. */
function initialsOf(value?: string) {
  return String(value || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}
