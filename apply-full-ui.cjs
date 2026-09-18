const fs = require("fs");
const path = require("path");

const currentDirectory = process.cwd();

const projectRoot = fs.existsSync(
  path.join(currentDirectory, "frontend", "src")
)
  ? currentDirectory
  : path.resolve(currentDirectory, "..");

const frontendDirectory = path.join(projectRoot, "frontend");
const sourceDirectory = path.join(frontendDirectory, "src");

if (!fs.existsSync(sourceDirectory)) {
  console.error("Không tìm thấy frontend/src.");
  console.error("Hãy chạy file tại thư mục gốc của project thi.");
  process.exit(1);
}

/* =========================================================
   SAO LƯU FRONTEND
========================================================= */

const backupName = `src-backup-ui-${new Date()
  .toISOString()
  .replace(/[:.]/g, "-")}`;

const backupDirectory = path.join(frontendDirectory, backupName);

fs.cpSync(sourceDirectory, backupDirectory, {
  recursive: true,
});

console.log(`Đã sao lưu: frontend/${backupName}`);

/* =========================================================
   HÀM HỖ TRỢ
========================================================= */

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function replaceLast(content, search, replacement) {
  const index = content.lastIndexOf(search);

  if (index === -1) {
    return content;
  }

  return (
    content.slice(0, index) +
    replacement +
    content.slice(index + search.length)
  );
}

function getSourceFiles(directory) {
  const result = [];

  for (const item of fs.readdirSync(directory, {
    withFileTypes: true,
  })) {
    const fullPath = path.join(directory, item.name);

    if (item.isDirectory()) {
      result.push(...getSourceFiles(fullPath));
      continue;
    }

    if (/\.(jsx|js|css)$/i.test(item.name)) {
      result.push(fullPath);
    }
  }

  return result;
}

/* =========================================================
   ĐỔI DESIGN TOKEN TRONG TOÀN BỘ FRONTEND
========================================================= */

const replacements = [
  [/#1f4f46/gi, "#635bff"],
  [/#173f38/gi, "#4f46e5"],
  [/#eef5f2/gi, "#f0efff"],
  [/#f4f6f5/gi, "#f6f7fb"],
  [/#0d9488/gi, "#06b6d4"],
];

let changedFiles = 0;

for (const file of getSourceFiles(sourceDirectory)) {
  if (file.endsWith("redesign.css")) {
    continue;
  }

  const original = read(file);
  let updated = original;

  for (const [pattern, value] of replacements) {
    updated = updated.replace(pattern, value);
  }

  if (updated !== original) {
    write(file, updated);
    changedFiles++;
  }
}

/* =========================================================
   SỬA KHUNG APP, SIDEBAR, HEADER, MAIN CONTENT
========================================================= */

const appPath = path.join(sourceDirectory, "App.jsx");

if (!fs.existsSync(appPath)) {
  throw new Error("Không tìm thấy frontend/src/App.jsx");
}

let app = read(appPath);

const oldShell =
  'className="min-h-screen bg-[#f6f7fb] text-slate-900"';

if (!app.includes("login-shell") && app.includes(oldShell)) {
  app = app.replace(
    oldShell,
    'className="login-shell min-h-screen bg-[#f6f7fb] text-slate-900"'
  );
}

if (!app.includes("app-shell") && app.includes(oldShell)) {
  app = replaceLast(
    app,
    oldShell,
    'className="app-shell min-h-screen bg-[#f6f7fb] text-slate-900"'
  );
}

app = app.replace(
  '<aside className="flex h-full flex-col border-r border-slate-200 bg-white">',
  '<aside className="app-sidebar flex h-full flex-col border-r border-slate-200 bg-white">'
);

app = app.replace(
  'className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-72"',
  'className="app-sidebar-desktop hidden lg:fixed lg:inset-y-0 lg:left-0 lg:block lg:w-[17rem]"'
);

app = app.replace(
  'className="relative h-full w-72"',
  'className="app-sidebar-mobile relative h-full w-[17rem]"'
);

app = app.replace(
  '<div className="lg:pl-72">',
  '<div className="app-content lg:pl-[17rem]">'
);

app = app.replace(
  '<header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8">',
  '<header className="app-topbar sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-8">'
);

app = app.replace(
  '<div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 lg:flex-row lg:items-center lg:px-8">',
  '<div className="app-page-title flex flex-col justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 lg:flex-row lg:items-center lg:px-8">'
);

app = app.replace(
  '<main className="p-4 lg:p-8">',
  '<main className="app-main p-4 lg:p-8">'
);

/*
 * QuickReport và Dashboard tự có phần tiêu đề riêng.
 * Không hiển thị PageTitle trùng lặp.
 */
app = app.replace(
  "{tab && (\n          <PageTitle",
  '{tab && tab !== "dashboard" && tab !== "quick-report" && (\n          <PageTitle'
);

app = app.replace(
  '{tab === "dashboard" && (\n            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">',
  '{tab === "dashboard" && (\n            <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="dashboard-view space-y-6">'
);

write(appPath, app);

/* =========================================================
   ĐÁNH DẤU TRANG QUICK REPORT
========================================================= */

const quickReportPath = path.join(
  sourceDirectory,
  "pages",
  "QuickReport.jsx"
);

if (fs.existsSync(quickReportPath)) {
  let quickReport = read(quickReportPath);

  if (!quickReport.includes("quick-report-view")) {
    quickReport = quickReport.replace(
      'className="space-y-6"\n    >',
      'className="quick-report-view space-y-6"\n    >'
    );
  }

  write(quickReportPath, quickReport);
}

/* =========================================================
   IMPORT FILE GIAO DIỆN
========================================================= */

const mainPath = path.join(sourceDirectory, "main.jsx");
let main = read(mainPath);

main = main.replace(
  /\nimport\s+["']\.\/premium-theme\.css["'];?/g,
  ""
);

main = main.replace(
  /\nimport\s+["']\.\/redesign\.css["'];?/g,
  ""
);

main = main.replace(
  /import\s+["']\.\/index\.css["'];?/,
  "import './index.css';\nimport './redesign.css';"
);

write(mainPath, main);

/* =========================================================
   CSS GIAO DIỆN TOÀN HỆ THỐNG
========================================================= */

const redesignCSS = `
:root {
  --ui-primary: #635bff;
  --ui-primary-hover: #5147e5;
  --ui-primary-soft: #f0efff;
  --ui-primary-border: #dcd9ff;

  --ui-bg: #f6f7fb;
  --ui-surface: #ffffff;
  --ui-surface-soft: #fafbff;

  --ui-text: #111827;
  --ui-muted: #64748b;
  --ui-border: #e5e7ef;

  --ui-success: #10b981;
  --ui-warning: #f59e0b;
  --ui-danger: #f43f5e;
  --ui-info: #3b82f6;

  --ui-radius: 16px;
  --ui-shadow:
    0 1px 2px rgba(15, 23, 42, 0.03),
    0 8px 24px rgba(15, 23, 42, 0.055);
  --ui-shadow-hover:
    0 4px 8px rgba(15, 23, 42, 0.04),
    0 18px 42px rgba(15, 23, 42, 0.09);
}

* {
  box-sizing: border-box;
}

html {
  background: var(--ui-bg);
  scroll-behavior: smooth;
}

body {
  margin: 0;
  min-width: 320px;
  background:
    radial-gradient(
      circle at 90% 0%,
      rgba(99, 91, 255, 0.07),
      transparent 28rem
    ),
    var(--ui-bg);
  color: var(--ui-text);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  -webkit-font-smoothing: antialiased;
}

button,
input,
textarea,
select {
  font: inherit;
}

button {
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

::selection {
  background: rgba(99, 91, 255, 0.2);
}

/* =========================================================
   APP SHELL
========================================================= */

.app-shell {
  min-height: 100vh;
  background:
    linear-gradient(
      135deg,
      rgba(99, 91, 255, 0.025),
      transparent 38%
    ),
    var(--ui-bg);
}

.app-sidebar-desktop {
  z-index: 40;
}

.app-sidebar {
  background: rgba(255, 255, 255, 0.98) !important;
  border-color: var(--ui-border) !important;
  box-shadow: 10px 0 35px rgba(15, 23, 42, 0.035);
}

.app-sidebar > div:first-child {
  height: 76px;
  border-color: var(--ui-border);
  padding-left: 20px;
  padding-right: 20px;
}

.app-sidebar > div:first-child > div:first-child {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background:
    linear-gradient(135deg, #746dff 0%, #5549e8 100%) !important;
  box-shadow: 0 10px 22px rgba(99, 91, 255, 0.28);
}

.app-sidebar nav {
  padding: 14px 12px 18px;
}

.app-sidebar nav::-webkit-scrollbar {
  width: 5px;
}

.app-sidebar nav::-webkit-scrollbar-thumb {
  background: #d9dce8;
  border-radius: 999px;
}

.app-sidebar nav > div {
  margin-bottom: 4px;
}

.app-sidebar nav button {
  min-height: 42px;
  border-radius: 12px;
}

.app-sidebar nav button:hover {
  transform: translateX(2px);
}

.app-sidebar nav button.bg-\\[\\#f0efff\\] {
  color: var(--ui-primary) !important;
  background:
    linear-gradient(
      90deg,
      rgba(99, 91, 255, 0.13),
      rgba(99, 91, 255, 0.06)
    ) !important;
  box-shadow: inset 3px 0 0 var(--ui-primary);
}

.app-sidebar nav .border-l {
  border-color: #e9eaf2 !important;
}

.app-sidebar > div:last-child {
  border-color: var(--ui-border) !important;
  background:
    linear-gradient(145deg, #fafaff, #f5f5fc) !important;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.app-content {
  min-height: 100vh;
}

.app-topbar {
  height: 76px !important;
  padding-left: 28px !important;
  padding-right: 28px !important;
  border-color: var(--ui-border) !important;
  background: rgba(255, 255, 255, 0.88) !important;
  box-shadow: 0 1px 12px rgba(15, 23, 42, 0.025);
  backdrop-filter: blur(18px);
}

.app-topbar button,
.app-topbar > div:last-child > div {
  border-color: var(--ui-border) !important;
}

.app-topbar button:hover {
  color: var(--ui-primary);
  background: var(--ui-primary-soft) !important;
  border-color: var(--ui-primary-border) !important;
}

.app-page-title {
  padding: 27px 32px !important;
  border-color: var(--ui-border) !important;
  background:
    linear-gradient(
      110deg,
      rgba(255, 255, 255, 0.98),
      rgba(250, 250, 255, 0.94)
    ) !important;
}

.app-page-title h2 {
  color: #101828;
  font-size: 28px;
  letter-spacing: -0.035em;
}

.app-page-title > div:first-child > p:first-child {
  color: var(--ui-primary) !important;
}

.app-main {
  width: 100%;
  max-width: 1920px;
  margin-left: auto;
  margin-right: auto;
  padding: 28px 32px 46px !important;
}

/* =========================================================
   PAGE TRANSITION
========================================================= */

.app-main > section,
.app-main > div {
  animation: uiPageIn 0.28s ease-out;
}

@keyframes uiPageIn {
  from {
    opacity: 0;
    transform: translateY(7px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* =========================================================
   CARD
========================================================= */

.app-main .rounded-2xl.border.bg-white,
.app-main .rounded-xl.border.bg-white {
  border-color: var(--ui-border) !important;
  background: rgba(255, 255, 255, 0.98) !important;
  box-shadow: var(--ui-shadow);
}

.app-main .rounded-2xl.border.bg-white {
  border-radius: 18px !important;
}

.app-main .rounded-xl.border.bg-white {
  border-radius: 14px !important;
}

.app-main .rounded-2xl.border.bg-white:hover,
.app-main .rounded-xl.border.bg-white:hover {
  border-color: #dcddea !important;
}

.app-main .group.rounded-2xl.border.bg-white,
.app-main .group.rounded-xl.border.bg-white {
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease,
    border-color 0.22s ease;
}

.app-main .group.rounded-2xl.border.bg-white:hover,
.app-main .group.rounded-xl.border.bg-white:hover {
  transform: translateY(-3px);
  border-color: var(--ui-primary-border) !important;
  box-shadow: var(--ui-shadow-hover);
}

/* =========================================================
   BUTTON
========================================================= */

button {
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

button.bg-\\[\\#635bff\\] {
  color: white !important;
  background:
    linear-gradient(
      135deg,
      #6f67ff 0%,
      #554ae8 100%
    ) !important;
  border-color: transparent !important;
  box-shadow:
    0 7px 17px rgba(99, 91, 255, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

button.bg-\\[\\#635bff\\]:hover {
  background:
    linear-gradient(
      135deg,
      #6259f2 0%,
      #493ed5 100%
    ) !important;
  box-shadow:
    0 10px 22px rgba(99, 91, 255, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

button.border.bg-white {
  border-color: var(--ui-border) !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
}

button.border.bg-white:hover {
  color: var(--ui-primary);
  border-color: var(--ui-primary-border) !important;
  background: #fafaff !important;
}

/* =========================================================
   FORM
========================================================= */

.app-main input,
.app-main select,
.app-main textarea,
.login-shell input,
.login-shell select,
.login-shell textarea {
  border-color: var(--ui-border) !important;
  background: white;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    background-color 0.18s ease;
}

.app-main input:focus,
.app-main select:focus,
.app-main textarea:focus,
.login-shell input:focus,
.login-shell select:focus,
.login-shell textarea:focus {
  border-color: var(--ui-primary) !important;
  box-shadow: 0 0 0 4px rgba(99, 91, 255, 0.1);
  outline: none;
}

.app-main textarea {
  line-height: 1.6;
  resize: vertical;
}

.app-main label {
  color: #475569;
}

/* =========================================================
   TABLE
========================================================= */

.app-main table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.app-main thead {
  background:
    linear-gradient(
      180deg,
      #fbfbfe,
      #f7f7fb
    ) !important;
}

.app-main thead th {
  color: #697386 !important;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.055em;
  border-bottom: 1px solid var(--ui-border);
}

.app-main tbody {
  background: white;
}

.app-main tbody tr {
  transition:
    background-color 0.16s ease,
    box-shadow 0.16s ease;
}

.app-main tbody tr:hover {
  background: #fafaff !important;
}

.app-main tbody td {
  border-color: #eff0f5 !important;
}

/* =========================================================
   BADGE
========================================================= */

.app-main span.rounded-full.border,
.app-sidebar span.rounded-full.border {
  font-weight: 650;
  letter-spacing: 0.005em;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

/* =========================================================
   DASHBOARD
========================================================= */

.dashboard-view,
.quick-report-view {
  position: relative;
}

.dashboard-view::before,
.quick-report-view::before {
  position: absolute;
  top: -12px;
  right: 8%;
  z-index: -1;
  width: 280px;
  height: 280px;
  content: "";
  pointer-events: none;
  background: rgba(99, 91, 255, 0.07);
  border-radius: 999px;
  filter: blur(90px);
}

.dashboard-view > .grid > div > .rounded-2xl,
.quick-report-view > .grid > div {
  min-height: 142px;
}

.dashboard-view .text-3xl,
.quick-report-view .text-2xl {
  letter-spacing: -0.035em;
}

.dashboard-view .recharts-cartesian-grid line,
.quick-report-view .recharts-cartesian-grid line {
  stroke: #ececf3;
}

.dashboard-view .recharts-default-tooltip,
.quick-report-view .recharts-default-tooltip {
  border: 1px solid var(--ui-border) !important;
  border-radius: 13px !important;
  box-shadow: var(--ui-shadow) !important;
}

.quick-report-view > div:first-child {
  margin-bottom: 26px;
}

.quick-report-view > div:first-child h2 {
  font-size: 30px;
  letter-spacing: -0.04em;
}

.quick-report-view > .grid {
  gap: 18px;
}

/* =========================================================
   MODAL
========================================================= */

.fixed.inset-0.z-50 > div.bg-white,
.fixed.inset-0.z-50 .rounded-2xl.bg-white {
  border: 1px solid rgba(229, 231, 239, 0.95);
  border-radius: 20px !important;
  box-shadow:
    0 30px 80px rgba(15, 23, 42, 0.22),
    0 3px 14px rgba(15, 23, 42, 0.1) !important;
}

.fixed.inset-0.z-50 .border-b {
  border-color: var(--ui-border) !important;
}

/* =========================================================
   LOGIN
========================================================= */

.login-shell {
  background:
    radial-gradient(
      circle at 75% 20%,
      rgba(99, 91, 255, 0.11),
      transparent 28rem
    ),
    #f7f8fc !important;
}

.login-shell section:first-child {
  background:
    radial-gradient(
      circle at 75% 30%,
      rgba(255, 255, 255, 0.14),
      transparent 18rem
    ),
    linear-gradient(
      145deg,
      #19183a 0%,
      #373078 52%,
      #5b51db 100%
    ) !important;
}

.login-shell section:last-child .rounded-2xl.border.bg-white {
  border-color: rgba(226, 228, 239, 0.95) !important;
  box-shadow:
    0 25px 70px rgba(31, 29, 74, 0.12),
    0 2px 8px rgba(15, 23, 42, 0.04) !important;
}

/* =========================================================
   SCROLLBAR
========================================================= */

::-webkit-scrollbar {
  width: 9px;
  height: 9px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: #d7d9e4;
  border: 2px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
}

::-webkit-scrollbar-thumb:hover {
  background: #bfc2d2;
  border: 2px solid transparent;
  background-clip: padding-box;
}

/* =========================================================
   RESPONSIVE
========================================================= */

@media (min-width: 1536px) {
  .dashboard-view > .grid:first-of-type {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .quick-report-view > .grid {
    column-gap: 20px;
  }
}

@media (max-width: 1023px) {
  .app-main {
    padding: 20px !important;
  }

  .app-topbar {
    height: 68px !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
  }

  .app-page-title {
    padding: 22px 20px !important;
  }

  .app-sidebar-mobile {
    box-shadow: 20px 0 50px rgba(15, 23, 42, 0.18);
  }
}

@media (max-width: 639px) {
  .app-main {
    padding: 14px 12px 30px !important;
  }

  .app-page-title {
    padding: 18px 14px !important;
  }

  .app-page-title h2 {
    font-size: 23px;
  }

  .app-topbar {
    padding-left: 12px !important;
    padding-right: 12px !important;
  }

  .dashboard-view > .grid,
  .quick-report-view > .grid {
    gap: 12px;
  }

  .app-main .rounded-2xl.border.bg-white {
    border-radius: 15px !important;
  }
}

/* =========================================================
   ACCESSIBILITY
========================================================= */

button:focus-visible,
a:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible {
  outline: 3px solid rgba(99, 91, 255, 0.22);
  outline-offset: 2px;
}
`;

write(
  path.join(sourceDirectory, "redesign.css"),
  redesignCSS.trim() + "\n"
);

/* =========================================================
   HOÀN TẤT
========================================================= */

console.log("");
console.log("==============================================");
console.log("ĐÃ SỬA GIAO DIỆN TOÀN BỘ FRONTEND");
console.log("==============================================");
console.log(`Số file được cập nhật màu: ${changedFiles}`);
console.log("Đã sửa:");
console.log("- Trang đăng nhập");
console.log("- Sidebar");
console.log("- Header");
console.log("- Page title");
console.log("- Dashboard");
console.log("- Quick Report");
console.log("- Card toàn hệ thống");
console.log("- Bảng dữ liệu");
console.log("- Form, input, select, textarea");
console.log("- Button và badge");
console.log("- Modal");
console.log("- Responsive mobile/tablet");
console.log("");
console.log("Không sửa backend.");
console.log("Không sửa database.");
console.log("Không thay đổi API hoặc nghiệp vụ.");
console.log("");
console.log("Bản sao lưu:");
console.log(backupDirectory);
console.log("==============================================");