import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import { useQuery } from '../hooks/useQuery';
import { childrenApi } from '../services/api';
import { exportDatabaseFile, fetchDatabaseInfo, importDatabaseFile } from '../services/databaseApi';
import { AddApplicantModal } from '../components/AddApplicantModal';
import { getApplicantStatusDisplay } from '../utils/applicantStatus';

function formatAgeGroupLabel(value) {
  if (!value || value === 'unknown') return 'Unknown';
  return String(value).replace(/_/g, ' ');
}

export function Dashboard() {
  const [modalOpen, setModalOpen] = useState(false);
  const [listKey, setListKey] = useState(0);
  const [dbBusy, setDbBusy] = useState(false);
  const importDbInputRef = useRef(null);
  const { data, loading, error } = useQuery(childrenApi.list, [listKey]);
  const { data: dbInfo, error: dbInfoError } = useQuery(fetchDatabaseInfo, []);
  const list = Array.isArray(data) ? data : [];
  const recentApplicants = list.slice(0, 5);

  const registrationCounts = useMemo(() => {
    let verified = 0;
    let underProcess = 0;
    let incomplete = 0;
    for (const child of list) {
      const { key } = getApplicantStatusDisplay({
        checklist_total: child.checklist_total,
        checklist_checked: child.checklist_checked,
        staff_process_status: child.staff_process_status,
      });
      if (key === 'verified') verified += 1;
      else if (key === 'under_process') underProcess += 1;
      else incomplete += 1;
    }
    return { verified, underProcess, incomplete };
  }, [list]);

  const completedCount = registrationCounts.verified;
  const pendingCount = list.length - completedCount;

  const applicantsByAgeGroup = useMemo(() => {
    const counts = new Map();
    for (const child of list) {
      const key = child.age_group || 'unknown';
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()]
      .map(([age_group, count]) => ({
        label: formatAgeGroupLabel(age_group),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [list]);

  const registrationStatusPie = useMemo(() => {
    const { verified, underProcess, incomplete } = registrationCounts;
    const rows = [
      { name: 'Verified', value: verified, color: '#059669' },
      { name: 'Under process', value: underProcess, color: '#0284c7' },
      { name: 'Incomplete checklist', value: incomplete, color: '#d97706' },
    ];
    return rows.filter((d) => d.value > 0);
  }, [registrationCounts]);

  const stats = [
    { id: 'total', label: 'Total Applicants', value: list.length, hint: 'All recorded applicants' },
    { id: 'completed', label: 'Completed Registrations', value: completedCount, hint: 'Staff-verified applicants' },
    { id: 'pending', label: 'Pending Registrations', value: pendingCount, hint: 'Everyone not yet verified' },
  ];

  const [importConfirmFile, setImportConfirmFile] = useState(null);

  const handleExportDatabase = async () => {
    setDbBusy(true);
    try {
      const blob = await exportDatabaseFile();
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `trace-backup-${stamp}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup exported (database and attachments).');
    } catch (err) {
      toast.error(err?.message || 'Export failed.');
    } finally {
      setDbBusy(false);
    }
  };

  const handleImportDatabase = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error('Select a .zip backup file.');
      return;
    }
    setImportConfirmFile(file);
  };

  const executeImport = async () => {
    const file = importConfirmFile;
    setImportConfirmFile(null);
    if (!file) return;
    
    setDbBusy(true);
    try {
      const result = await importDatabaseFile(file);
      const summary = result?.summary;
      if (summary) {
        toast.success(
          `Import complete: ${summary.addedApplicants} applicants added, ${summary.skippedApplicants} skipped, ${summary.addedChecklistItems} checklist added, ${summary.mergedChecklistItems} checklist merged, ${summary.copiedAttachments} attachments copied.`
        );
      } else {
        toast.success('Backup imported.');
      }
      setListKey((k) => k + 1);
    } catch (err) {
      toast.error(err?.message || 'Import failed.');
    } finally {
      setDbBusy(false);
    }
  };

  return (  
    <div className="space-y-6 lg:space-y-8">
      <header className="rounded-2xl border border-emerald-100 bg-gradient-to-r from-white via-emerald-50/70 to-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-800 lg:text-3xl">Dashboard</h1>
            <p className="mt-2 text-sm text-slate-600 md:text-base">
              Overview of applicants and document requirements.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={importDbInputRef}
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              onChange={handleImportDatabase}
              aria-label="Import backup zip"
            />
            <button
              type="button"
              onClick={handleExportDatabase}
              disabled={dbBusy}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Export backup
            </button>
            <button
              type="button"
              onClick={() => importDbInputRef.current?.click()}
              disabled={dbBusy}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
            >
              Import backup
            </button>
          </div>
        </div>
        {(dbInfo || dbInfoError) && (
          <div>
          </div>
        )}
      </header>

      <AddApplicantModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onAdded={() => setListKey((k) => k + 1)}
      />

      {importConfirmFile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-800">
              Import Backup
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Import new applicants and attachments from this backup? Existing matching applicants will be skipped.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setImportConfirmFile(null);
                  if (importDbInputRef.current) importDbInputRef.current.value = '';
                }}
                disabled={dbBusy}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeImport}
                disabled={dbBusy}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
              >
                {dbBusy ? 'Importing…' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800" role="alert">
          {error.message}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <section
            key={stat.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            aria-labelledby={`stats-${stat.id}`}
          >
            <h2 id={`stats-${stat.id}`} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {stat.label}
            </h2>
            <p className="mt-3 text-3xl font-bold text-slate-800">
              {loading ? <span className="inline-block h-9 w-14 animate-pulse rounded-md bg-slate-200" /> : stat.value}
            </p>
            <p className="mt-2 text-xs text-slate-500">{stat.hint}</p>
          </section>
        ))}
      </div>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Applicants by age group</h2>
          <p className="mt-1 text-xs text-slate-500">Count of applicants in each age category.</p>
          <div className="mt-4 h-72 w-full min-h-[280px]">
            {loading ? (
              <div className="flex h-full items-center justify-center rounded-lg bg-slate-50">
                <div className="h-40 w-full max-w-md animate-pulse rounded-md bg-slate-200" />
              </div>
            ) : applicantsByAgeGroup.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                No applicants to chart yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={applicantsByAgeGroup} margin={{ top: 8, right: 8, left: 0, bottom: 64 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={72}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} width={36} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [value, 'Applicants']}
                  />
                  <Bar dataKey="count" name="Applicants" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Registration status</h2>
          <p className="mt-1 text-xs text-slate-500">Same statuses as the applicant list: verified, under process, or incomplete checklist.</p>
          <div className="mt-4 h-72 w-full min-h-[280px]">
            {loading ? (
              <div className="flex h-full items-center justify-center rounded-lg bg-slate-50">
                <div className="h-48 w-48 animate-pulse rounded-full bg-slate-200" />
              </div>
            ) : list.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                No applicants to chart yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={registrationStatusPie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={88}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {registrationStatusPie.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} stroke="#fff" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [value, 'Applicants']}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4">

        <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Recent Applicants</h2>
            <Link to="/children" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">
              Open full list
            </Link>
          </div>

          {loading ? (
            <ul className="divide-y divide-slate-200">
              {[1, 2, 3, 4, 5].map((item) => (
                <li key={item} className="px-5 py-3">
                  <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                  <div className="mt-2 h-3 w-56 animate-pulse rounded bg-slate-100" />
                </li>
              ))}
            </ul>
          ) : recentApplicants.length > 0 ? (
            <ul className="divide-y divide-slate-200">
              {recentApplicants.map((c) => (
                <li key={c.id}>
                  <Link to={`/children/${c.id}`} className="block px-5 py-3 transition hover:bg-slate-50 focus:bg-slate-50">
                    <span className="font-medium text-slate-800">
                      {c.last_name}, {c.first_name}
                    </span>
                    <span className="ml-2 text-sm text-slate-500">
                      Age {c.age} · {c.age_group?.replace(/_/g, ' ') || '—'}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-slate-700">No applicants yet</p>
              <p className="mt-1 text-sm text-slate-500">Start by adding your first applicant record.</p>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
