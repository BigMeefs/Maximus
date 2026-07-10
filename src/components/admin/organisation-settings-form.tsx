"use client";

import { useActionState, useState, useTransition } from "react";
import type { OrganisationSettings } from "@/types/database";
import {
  removeOrganisationLogo,
  updateOrganisationSettings,
  uploadOrganisationLogo,
  type OrganisationSettingsFormState,
} from "@/lib/actions/organisation-settings";

const initialState: OrganisationSettingsFormState = {};

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export default function OrganisationSettingsForm({
  settings,
  logoUrl,
}: {
  settings: OrganisationSettings;
  logoUrl: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateOrganisationSettings, initialState);

  return (
    <div className="max-w-2xl space-y-6">
      <LogoUploader logoUrl={logoUrl} logoName={settings.logo_name} />

      <form action={formAction} className="space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Organisation Name" required>
            <input name="org_name" required defaultValue={settings.org_name} className={inputClass} />
          </Field>
          <Field label="Application Name" required>
            <input name="app_name" required defaultValue={settings.app_name} className={inputClass} />
          </Field>
          <Field label="Primary Colour" required>
            <ColorField name="primary_color" defaultValue={settings.primary_color} />
          </Field>
          <Field label="Secondary Colour" required>
            <ColorField name="secondary_color" defaultValue={settings.secondary_color} />
          </Field>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {pending ? "Saving..." : "Save settings"}
          </button>
          {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        </div>

        {settings.updated_at && (
          <p className="text-xs text-slate-500">
            Last updated {new Date(settings.updated_at).toLocaleString("en-GB")}
            {settings.updated_by ? ` by ${settings.updated_by}` : ""}.
          </p>
        )}
      </form>
    </div>
  );
}

function ColorField({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 w-9 shrink-0 cursor-pointer rounded border border-slate-300 bg-white p-0.5"
      />
      <input
        name={name}
        required
        pattern="^#[0-9a-fA-F]{6}$"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

function LogoUploader({ logoUrl, logoName }: { logoUrl: string | null; logoName: string | null }) {
  const [uploading, startUploadTransition] = useTransition();
  const [removing, startRemoveTransition] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-900">Organisation Logo</h2>
      <p className="mt-1 text-xs text-slate-500">
        Shown throughout the app in place of the default &ldquo;SE&rdquo; mark. Falls back to the
        initials mark if none is set.
      </p>

      {logoUrl && (
        <div className="mt-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- external Supabase storage URL, not a static local asset */}
          <img src={logoUrl} alt="Organisation logo" className="h-12 w-auto rounded border border-slate-100" />
          <div>
            <p className="text-sm text-slate-700">{logoName}</p>
            <button
              type="button"
              disabled={removing}
              onClick={() => startRemoveTransition(() => removeOrganisationLogo())}
              className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
            >
              {removing ? "Removing..." : "Remove logo"}
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setUploadError(null);
          const formData = new FormData(e.currentTarget);
          startUploadTransition(async () => {
            try {
              await uploadOrganisationLogo(formData);
              e.currentTarget.reset();
            } catch (err) {
              setUploadError(err instanceof Error ? err.message : "Upload failed.");
            }
          });
        }}
        className="mt-4 flex items-center gap-3"
      >
        <input
          type="file"
          name="logo"
          accept="image/*"
          required
          className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
        />
        <button
          type="submit"
          disabled={uploading}
          className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-60"
        >
          {uploading ? "Uploading..." : logoUrl ? "Replace logo" : "Upload logo"}
        </button>
        {uploadError && <span className="text-sm text-red-600">{uploadError}</span>}
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {children}
    </div>
  );
}
