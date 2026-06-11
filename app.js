const CONFIG = {
  username: "07716163020",
  password: "07716163020@",
  storageKey: "ems_enterprise_data_v1",
  sessionKey: "ems_enterprise_session_v1",
  archiveKey: "ems_archives_v1",
  absenceDeduction: 11666.7,
  lateDeduction: 5000,
};

const CREDENTIALS_KEY = "ems_credentials_v1";
let EFFECTIVE_CREDENTIALS = {
  username: CONFIG.username,
  password: CONFIG.password,
};
function loadSavedCredentials() {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.username) EFFECTIVE_CREDENTIALS.username = parsed.username;
    if (parsed.password) EFFECTIVE_CREDENTIALS.password = parsed.password;
  } catch {
    // ignore
  }
}
function saveCredentials() {
  localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(EFFECTIVE_CREDENTIALS));
}

const state = {
  employees: [],
  activities: [],
  selectedEmployeeId: null,
  activeView: "dashboardView",
  archives: {},
};

const els = {};

const money = new Intl.NumberFormat("ar-IQ", {
  style: "currency",
  currency: "IQD",
  maximumFractionDigits: 0,
});

const arabicDate = new Intl.DateTimeFormat("ar-IQ", {
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
});

const pad = (value) => String(value).padStart(2, "0");
const todayISO = () => new Date().toISOString().slice(0, 10);
const currentMonthKey = () => new Date().toISOString().slice(0, 7);
const uid = () =>
  globalThis.crypto?.randomUUID?.() ||
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function boot() {
  cacheElements();
  loadSavedCredentials();
  loadArchives();
  bindEvents();
  tickClock();
  setInterval(tickClock, 1000);
  loadData();
  runMonthlyReset();

  if (localStorage.getItem(CONFIG.sessionKey) === "active") {
    showApp();
  } else {
    showLogin();
  }
}

function cacheElements() {
  Object.assign(els, {
    loginScreen: document.getElementById("loginScreen"),
    appShell: document.getElementById("appShell"),
    loginForm: document.getElementById("loginForm"),
    username: document.getElementById("username"),
    password: document.getElementById("password"),
    togglePassword: document.getElementById("togglePassword"),
    loginError: document.getElementById("loginError"),
    navItems: document.querySelectorAll(".nav-item"),
    views: document.querySelectorAll(".view"),
    pageTitle: document.getElementById("pageTitle"),
    logoutBtn: document.getElementById("logoutBtn"),
    settingsBtn: document.getElementById("settingsBtn"),
    settingsModal: document.getElementById("settingsModal"),
    settingsForm: document.getElementById("settingsForm"),
    settingsCurrentUsername: document.getElementById("settingsCurrentUsername"),
    settingsCurrentPassword: document.getElementById("settingsCurrentPassword"),
    settingsNewUsername: document.getElementById("settingsNewUsername"),
    settingsNewPassword: document.getElementById("settingsNewPassword"),
    settingsConfirmPassword: document.getElementById("settingsConfirmPassword"),
    darkModeToggle: document.getElementById("darkModeToggle"),
    mobileMenuBtn: document.getElementById("mobileMenuBtn"),
    sidebar: document.querySelector(".sidebar"),
    dateLabel: document.getElementById("dateLabel"),
    clockLabel: document.getElementById("clockLabel"),
    totalEmployees: document.getElementById("totalEmployees"),
    totalMonthlySalaries: document.getElementById("totalMonthlySalaries"),
    totalWithdrawals: document.getElementById("totalWithdrawals"),
    absentToday: document.getElementById("absentToday"),
    salaryChart: document.getElementById("salaryChart"),
    activityFeed: document.getElementById("activityFeed"),
    searchInput: document.getElementById("searchInput"),
    employeesTable: document.getElementById("employeesTable"),
    employeeCountBadge: document.getElementById("employeeCountBadge"),
    employeeDetails: document.getElementById("employeeDetails"),
    openEmployeeModal: document.getElementById("openEmployeeModal"),
    markAllPresentBtn: document.getElementById("markAllPresentBtn"),
    openBatchAttendanceBtn: document.getElementById("openBatchAttendanceBtn"),
    batchAttendanceModal: document.getElementById("batchAttendanceModal"),
    batchAttendanceForm: document.getElementById("batchAttendanceForm"),
    batchAttendanceList: document.getElementById("batchAttendanceList"),
    employeeModal: document.getElementById("employeeModal"),
    employeeForm: document.getElementById("employeeForm"),
    employeeId: document.getElementById("employeeId"),
    employeeName: document.getElementById("employeeName"),
    employeeSalary: document.getElementById("employeeSalary"),
    employeeDailySalary: document.getElementById("employeeDailySalary"),
    employeeStartDate: document.getElementById("employeeStartDate"),
    employeeImage: document.getElementById("employeeImage"),
    employeeNotes: document.getElementById("employeeNotes"),
    modalTitle: document.getElementById("modalTitle"),
    withdrawalModal: document.getElementById("withdrawalModal"),
    withdrawalForm: document.getElementById("withdrawalForm"),
    withdrawalEmployeeId: document.getElementById("withdrawalEmployeeId"),
    withdrawalAmount: document.getElementById("withdrawalAmount"),
    withdrawalDate: document.getElementById("withdrawalDate"),
    withdrawalReason: document.getElementById("withdrawalReason"),
    deductionModal: document.getElementById("deductionModal"),
    deductionForm: document.getElementById("deductionForm"),
    deductionEmployeeId: document.getElementById("deductionEmployeeId"),
    deductionAmount: document.getElementById("deductionAmount"),
    deductionDate: document.getElementById("deductionDate"),
    deductionReason: document.getElementById("deductionReason"),
    printEmployeesA4Btn: document.getElementById("printEmployeesA4Btn"),
    exportFullReportBtn: document.getElementById("exportFullReportBtn"),
    monthlyAbsenceForm: document.getElementById("monthlyAbsenceForm"),
    monthlyAbsenceEmployee: document.getElementById("monthlyAbsenceEmployee"),
    monthlyAbsenceDays: document.getElementById("monthlyAbsenceDays"),
    backupBtn: document.getElementById("backupBtn"),
    restoreInput: document.getElementById("restoreInput"),
    clearDataBtn: document.getElementById("clearDataBtn"),
    seedDemoBtn: document.getElementById("seedDemoBtn"),
    toastHost: document.getElementById("toastHost"),
    printFrame: document.getElementById("printFrame"),
  });
}

function bindEvents() {
  els.loginForm.addEventListener("submit", handleLogin);
  els.togglePassword.addEventListener("click", () => {
    els.password.type = els.password.type === "password" ? "text" : "password";
  });

  els.logoutBtn.addEventListener("click", () => {
    localStorage.removeItem(CONFIG.sessionKey);
    showLogin();
    notify("تم تسجيل الخروج بنجاح");
  });

  els.darkModeToggle.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    localStorage.setItem(
      "ems_theme",
      document.body.classList.contains("light-mode") ? "light" : "dark",
    );
  });

  if (localStorage.getItem("ems_theme") === "light") {
    document.body.classList.add("light-mode");
  }

  els.mobileMenuBtn.addEventListener("click", () =>
    els.sidebar.classList.toggle("open"),
  );

  els.navItems.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  els.openEmployeeModal.addEventListener("click", () => openEmployeeEditor());
  els.employeeSalary.addEventListener("input", () => {
    els.employeeDailySalary.value =
      calculateDefaultDailySalary(els.employeeSalary.value) || "";
  });
  els.markAllPresentBtn.addEventListener("click", markAllEmployeesPresent);
  els.openBatchAttendanceBtn.addEventListener(
    "click",
    openBatchAttendanceModal,
  );
  els.batchAttendanceForm.addEventListener("submit", handleBatchAttendanceSave);
  els.employeeForm.addEventListener("submit", handleEmployeeSave);
  els.withdrawalForm.addEventListener("submit", handleWithdrawalSave);
  els.deductionForm.addEventListener("submit", handleDeductionSave);
  els.searchInput.addEventListener("input", renderEmployees);
  els.settingsBtn.addEventListener("click", openSettingsModal);
  els.settingsForm.addEventListener("submit", handleSettingsSave);

  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => button.closest("dialog").close());
  });

  els.employeesTable.addEventListener("click", handleEmployeeTableAction);
  els.employeeDetails.addEventListener("click", handleDetailsAction);
  els.printEmployeesA4Btn.addEventListener("click", printEmployeesA4Table);
  els.exportFullReportBtn.addEventListener("click", exportFullEmployeeCSV);
  els.monthlyAbsenceEmployee.addEventListener(
    "change",
    renderMonthlyAbsenceDays,
  );
  els.monthlyAbsenceForm.addEventListener("submit", handleMonthlyAbsenceSave);
  els.backupBtn.addEventListener("click", backupData);
  els.restoreInput.addEventListener("change", restoreData);
  els.clearDataBtn.addEventListener("click", clearAllData);
  els.seedDemoBtn.addEventListener("click", seedDemoData);

  window.addEventListener("resize", drawSalaryChart);
}

function normalizeDigits(s) {
  if (!s) return s;
  return String(s)
    .replace(/[\u0660-\u0669]/g, (c) => String(c.charCodeAt(0) - 0x0660)) // Arabic-Indic
    .replace(/[\u06F0-\u06F9]/g, (c) => String(c.charCodeAt(0) - 0x06f0)) // Extended Arabic-Indic
    .replace(/\u200F|\u200E/g, "")
    .trim();
}

function handleLogin(event) {
  event.preventDefault();
  const inputUser = normalizeDigits(els.username.value.trim());
  const inputPass = normalizeDigits(els.password.value);
  const valid =
    inputUser === normalizeDigits(EFFECTIVE_CREDENTIALS.username) &&
    inputPass === normalizeDigits(EFFECTIVE_CREDENTIALS.password);

  if (!valid) {
    els.loginError.textContent = "بيانات الدخول غير صحيحة";
    notify("فشل تسجيل الدخول، تحقق من اسم المستخدم وكلمة المرور", "error");
    return;
  }

  els.loginError.textContent = "";
  localStorage.setItem(CONFIG.sessionKey, "active");
  showApp();
  notify("مرحباً بك في مدينة العاب نور المقدادية - إدارة الموظفين");
}

function openSettingsModal() {
  if (!els.settingsModal) return;
  els.settingsCurrentUsername.value = EFFECTIVE_CREDENTIALS.username;
  els.settingsCurrentPassword.value = "";
  els.settingsNewUsername.value = "";
  els.settingsNewPassword.value = "";
  els.settingsConfirmPassword.value = "";
  els.settingsModal.showModal();
}

function handleSettingsSave(event) {
  event.preventDefault();
  const current = els.settingsCurrentPassword.value;
  if (current !== EFFECTIVE_CREDENTIALS.password) {
    notify("كلمة المرور الحالية غير صحيحة", "error");
    return;
  }

  const newU = els.settingsNewUsername.value.trim();
  const newP = els.settingsNewPassword.value;
  const conf = els.settingsConfirmPassword.value;
  if (newP && newP !== conf) {
    notify("كلمة المرور الجديدة غير متطابقة", "error");
    return;
  }

  if (!newU && !newP) {
    notify("لا تغييرات للحفظ", "error");
    return;
  }

  if (newU) EFFECTIVE_CREDENTIALS.username = newU;
  if (newP) EFFECTIVE_CREDENTIALS.password = newP;
  saveCredentials();

  // store password change history (masked)
  addPasswordHistory({
    username: EFFECTIVE_CREDENTIALS.username,
    password: newP || "[unchanged]",
    at: new Date().toISOString(),
  });

  els.settingsModal.close();
  notify("تم حفظ بيانات الدخول الجديدة");
}

function addPasswordHistory(entry) {
  try {
    const key = "ems_password_history_v1";
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    const masked =
      typeof entry.password === "string" && entry.password !== "[unchanged]"
        ? "*".repeat(Math.max(0, entry.password.length - 2)) +
          entry.password.slice(-2)
        : entry.password;
    arr.unshift({ username: entry.username, password: masked, at: entry.at });
    // keep last 200
    localStorage.setItem(key, JSON.stringify(arr.slice(0, 200)));
  } catch (e) {
    console.error(e);
  }
}

function showLogin() {
  els.loginScreen.classList.remove("hidden");
  els.appShell.classList.add("hidden");
}

function showApp() {
  els.loginScreen.classList.add("hidden");
  els.appShell.classList.remove("hidden");
  renderAll();
}

function switchView(viewId) {
  state.activeView = viewId;
  els.views.forEach((view) =>
    view.classList.toggle("active-view", view.id === viewId),
  );
  els.navItems.forEach((item) =>
    item.classList.toggle("active", item.dataset.view === viewId),
  );
  els.pageTitle.textContent = document.querySelector(
    `[data-view="${viewId}"]`,
  ).textContent;
  els.sidebar.classList.remove("open");
  if (viewId === "dashboardView") drawSalaryChart();
  if (viewId === "archiveView") renderArchives();
}

function loadData() {
  const raw = localStorage.getItem(CONFIG.storageKey);
  if (!raw) {
    state.employees = [];
    state.activities = [];
    saveData(false);
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.employees = Array.isArray(parsed.employees) ? parsed.employees : [];
    state.activities = Array.isArray(parsed.activities)
      ? parsed.activities
      : [];
  } catch {
    state.employees = [];
    state.activities = [];
    notify("تعذر قراءة قاعدة البيانات المحلية، تم بدء ملف جديد", "error");
  }
}

function saveData(shouldRender = true) {
  localStorage.setItem(
    CONFIG.storageKey,
    JSON.stringify({
      employees: state.employees,
      activities: state.activities,
      lastMonthKey: currentMonthKey(),
      updatedAt: new Date().toISOString(),
    }),
  );
  if (shouldRender) renderAll();
}

// ========== Archive Functions ==========
function loadArchives() {
  try {
    const raw = localStorage.getItem(CONFIG.archiveKey);
    state.archives = raw ? JSON.parse(raw) : {};
  } catch {
    state.archives = {};
  }
}

function saveArchives() {
  localStorage.setItem(CONFIG.archiveKey, JSON.stringify(state.archives));
}

function createMonthlyArchive(monthKey) {
  const [year, month] = monthKey.split("-");
  if (!state.archives[year]) state.archives[year] = {};
  if (state.archives[year][monthKey]) {
    notify("أرشيف هذا الشهر موجود مسبقاً", "error");
    return false;
  }

  const snapshot = state.employees.map((employee) => {
    const financial = getFinancials(employee);
    return {
      id: employee.id,
      name: employee.name,
      salary: Number(employee.salary || 0),
      dailySalary: Number(employee.dailySalary || 0),
      absences: Number(employee.absences || 0),
      startDate: employee.startDate || "",
      notes: employee.notes || "",
      attendance: [...(employee.attendance || [])],
      withdrawals: [...(employee.withdrawals || [])],
      deductions: [...(employee.deductions || [])],
      financial: {
        withdrawn: financial.withdrawn,
        deducted: financial.deducted,
        remaining: financial.remaining,
        salaryAfterDeductions: financial.salaryAfterDeductions,
      },
    };
  });

  state.archives[year][monthKey] = {
    employees: snapshot,
    createdAt: new Date().toISOString(),
    totalSalary: snapshot.reduce((sum, e) => sum + e.salary, 0),
    totalWithdrawals: snapshot.reduce((sum, e) => sum + e.financial.withdrawn, 0),
    totalDeductions: snapshot.reduce((sum, e) => sum + e.financial.deducted, 0),
    totalRemaining: snapshot.reduce((sum, e) => sum + e.financial.remaining, 0),
    totalAbsences: snapshot.reduce((sum, e) => sum + e.absences, 0),
    employeeCount: snapshot.length,
  };

  saveArchives();
  addActivity(`تم إنشاء أرشيف شهر ${monthKey} بنجاح`, "system");
  saveData(false);
  notify(`تم حفظ أرشيف شهر ${monthKey}`);
  return true;
}

function deleteMonthlyArchive(year, monthKey) {
  if (state.archives[year] && state.archives[year][monthKey]) {
    if (!confirm(`هل تريد حذف أرشيف شهر ${monthKey}؟`)) return;
    delete state.archives[year][monthKey];
    if (Object.keys(state.archives[year]).length === 0) {
      delete state.archives[year];
    }
    saveArchives();
    renderArchives();
    notify("تم حذف الأرشيف");
  }
}

function archiveCurrentMonth() {
  const monthKey = currentMonthKey();
  if (state.employees.length === 0) {
    notify("لا توجد بيانات موظفين لأرشفتها", "error");
    return;
  }
  if (createMonthlyArchive(monthKey)) {
    renderArchives();
  }
}

function getArchivedYears() {
  return Object.keys(state.archives).sort((a, b) => b - a);
}

function getArchivedMonths(year) {
  return state.archives[year]
    ? Object.keys(state.archives[year]).sort().reverse()
    : [];
}

function runMonthlyReset() {
  const raw = localStorage.getItem(CONFIG.storageKey);
  const parsed = raw ? JSON.parse(raw) : {};
  const savedMonth = parsed.lastMonthKey;
  const monthNow = currentMonthKey();

  if (savedMonth && savedMonth !== monthNow) {
    createMonthlyArchive(savedMonth);
    state.employees = state.employees.map((employee) => ({
      ...employee,
      absences: 0,
      attendance: [],
      withdrawals: [],
      deductions: [],
      monthlyCycle: monthNow,
    }));
    addActivity(
      "تم بدء دورة شهرية جديدة وإعادة ضبط الغيابات والسحوبات والخصومات تلقائياً",
      "system",
      false,
    );
    saveData(false);
    notify("تمت إعادة ضبط بيانات الشهر الجديد تلقائياً");
  } else if (!savedMonth) {
    saveData(false);
  }
}

function addActivity(message, type = "info", shouldSave = true) {
  state.activities.unshift({
    id: uid(),
    message,
    type,
    at: new Date().toISOString(),
  });
  state.activities = state.activities.slice(0, 30);
  if (shouldSave) saveData(false);
}

function renderAll() {
  renderDashboard();
  renderEmployees();
  renderDetails();
  renderMonthlyAbsenceTools();
  renderArchives();
}

function renderDashboard() {
  const totals = calculateTotals();
  els.totalEmployees.textContent = state.employees.length;
  els.totalMonthlySalaries.textContent = money.format(totals.salaries);
  els.totalWithdrawals.textContent = money.format(totals.withdrawals);
  els.absentToday.textContent = totals.absentToday;

  els.activityFeed.innerHTML = state.activities.length
    ? state.activities
        .map(
          (activity) =>
            `<div class="activity-item"><strong>${escapeHTML(formatDateTime(activity.at))}</strong><br>${escapeHTML(activity.message)}</div>`,
        )
        .join("")
    : `<div class="activity-item">لا توجد نشاطات بعد.</div>`;

  drawSalaryChart();
}

function renderMonthlyAbsenceTools() {
  if (!els.monthlyAbsenceEmployee || !els.monthlyAbsenceDays) return;

  const selectedValue = els.monthlyAbsenceEmployee.value;
  els.monthlyAbsenceEmployee.innerHTML = state.employees.length
    ? state.employees
        .map(
          (employee) =>
            `<option value="${employee.id}">${escapeHTML(employee.name)}</option>`,
        )
        .join("")
    : `<option value="">لا يوجد موظفون</option>`;

  if (
    selectedValue &&
    state.employees.some((employee) => employee.id === selectedValue)
  ) {
    els.monthlyAbsenceEmployee.value = selectedValue;
  }

  renderMonthlyAbsenceDays();
}

function renderMonthlyAbsenceDays() {
  if (!els.monthlyAbsenceEmployee || !els.monthlyAbsenceDays) return;
  const employee = state.employees.find(
    (item) => item.id === els.monthlyAbsenceEmployee.value,
  );

  if (!employee) {
    els.monthlyAbsenceDays.innerHTML = `<div class="log-item">اختر موظفاً لعرض أيام الشهر.</div>`;
    return;
  }

  const [year, month] = currentMonthKey().split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  els.monthlyAbsenceDays.innerHTML = Array.from(
    { length: daysInMonth },
    (_, index) => {
      const day = index + 1;
      const date = `${currentMonthKey()}-${pad(day)}`;
      const existing = (employee.attendance || []).find(
        (item) => item.date === date,
      );
      const disabled = Boolean(existing);
      const title = existing
        ? existing.type === "absence"
          ? "مسجل غياب مسبقاً"
          : "مسجل حضور مسبقاً"
        : "";
      return `<label class="day-check ${disabled ? "disabled" : ""}" title="${title}">
      <input type="checkbox" value="${date}" ${disabled ? "disabled" : ""} />
      <span>${day}</span>
    </label>`;
    },
  ).join("");
}

function handleMonthlyAbsenceSave(event) {
  event.preventDefault();
  const employee = state.employees.find(
    (item) => item.id === els.monthlyAbsenceEmployee.value,
  );
  if (!employee) {
    notify("يرجى اختيار موظف", "error");
    return;
  }

  const selectedDates = [
    ...els.monthlyAbsenceDays.querySelectorAll("input:checked"),
  ].map((input) => input.value);

  if (!selectedDates.length) {
    notify("اختر يوم غياب واحد على الأقل", "error");
    return;
  }

  let addedCount = 0;
  selectedDates.forEach((date) => {
    if (recordAbsence(employee, date, "غياب محدد من تقويم الشهر")) {
      addedCount += 1;
    }
  });

  addActivity(`تم تسجيل ${addedCount} يوم غياب للموظف ${employee.name}`);
  saveData();
  notify(`تم تسجيل ${addedCount} يوم غياب واحتساب الخصم تلقائياً`);
}

function renderEmployees() {
  const query = els.searchInput.value.trim().toLowerCase();
  const employees = state.employees.filter((employee) =>
    employee.name.toLowerCase().includes(query),
  );
  els.employeeCountBadge.textContent = `${employees.length} موظف`;

  els.employeesTable.innerHTML = employees.length
    ? employees
        .map((employee) => {
          const financial = getFinancials(employee);
          const attendance = getTodayAttendance(employee);
          return `
      <tr data-id="${employee.id}">
        <td>
          <button class="employee-cell link-reset" data-action="select" type="button">
            ${renderAvatar(employee)}
            <span><strong>${escapeHTML(employee.name)}</strong><br><small>منذ ${escapeHTML(employee.startDate || "غير محدد")}</small></span>
          </button>
        </td>
        <td>${money.format(Number(employee.salary || 0))}</td>
        <td><strong>${money.format(financial.remaining)}</strong></td>
        <td>${employee.absences || 0}</td>
        <td>${attendance ? attendanceBadge(attendance) : `<span class="status-badge danger">غير مسجل</span>`}</td>
        <td>
          <div class="row-actions">
            <button class="secondary-btn" data-action="select" type="button">عرض</button>
            <button class="secondary-btn" data-action="edit" type="button">تعديل</button>
            <button class="danger-btn" data-action="delete" type="button">حذف</button>
          </div>
        </td>
      </tr>`;
        })
        .join("")
    : `<tr><td colspan="6">لا توجد بيانات موظفين حالياً.</td></tr>`;
}

function renderDetails() {
  const employee = getSelectedEmployee();
  if (!employee) {
    els.employeeDetails.className = "details-panel glass-panel empty-state";
    els.employeeDetails.innerHTML = `<h2>اختر موظفاً</h2><p>ستظهر هنا تفاصيل الموظف والحضور والسحوبات والملاحظات.</p>`;
    return;
  }

  els.employeeDetails.className = "details-panel glass-panel";
  const financial = getFinancials(employee);
  const attendance = getTodayAttendance(employee);
  const logs = [...(employee.attendance || [])].reverse();
  const withdrawals = [...(employee.withdrawals || [])].reverse();
  const deductions = [...(employee.deductions || [])].reverse();

  els.employeeDetails.innerHTML = `
    <div class="profile-head">
      ${renderAvatar(employee)}
      <div>
        <h2>${escapeHTML(employee.name)}</h2>
        <span class="badge">أول يوم: ${escapeHTML(employee.startDate || "غير محدد")}</span>
      </div>
    </div>
    <div class="metrics-mini">
      <div class="metric-mini"><span>الراتب الأصلي</span><strong>${money.format(Number(employee.salary || 0))}</strong></div>
      <div class="metric-mini"><span>الراتب اليومي / خصم الغياب</span><strong>${money.format(getAbsenceDeduction(employee))}</strong></div>
      <div class="metric-mini"><span>المتبقي</span><strong>${money.format(financial.remaining)}</strong></div>
      <div class="metric-mini"><span>المسحوب هذا الشهر</span><strong>${money.format(financial.withdrawn)}</strong></div>
      <div class="metric-mini"><span>إجمالي الخصومات</span><strong>${money.format(financial.deducted)}</strong></div>
      <div class="metric-mini"><span>الغيابات</span><strong>${employee.absences || 0}</strong></div>
      <div class="metric-mini"><span>بعد السحوبات والخصومات</span><strong>${money.format(financial.salaryAfterDeductions)}</strong></div>
    </div>
    <div class="detail-actions">
      <button class="primary-btn" data-detail-action="checkin" type="button">تسجيل بدء العمل</button>
      <button class="secondary-btn" data-detail-action="absence" type="button">تسجيل غياب</button>
      <button class="secondary-btn" data-detail-action="withdrawal" type="button">إضافة سحب</button>
      <button class="secondary-btn" data-detail-action="deduction" type="button">إضافة خصم</button>
      <button class="secondary-btn" data-detail-action="print" type="button">طباعة التقرير</button>
      <button class="secondary-btn" data-detail-action="pdf" type="button">تصدير PDF</button>
    </div>
    <div class="details-section">
      <h3>حالة اليوم</h3>
      <div class="log-item">${attendance ? attendanceBadge(attendance) + ` وقت الدخول: <strong>${escapeHTML(attendance.time)}</strong>` : "لم يتم تسجيل حضور اليوم بعد."}</div>
    </div>
    <div class="details-section">
      <h3>سجل الحضور اليومي</h3>
      <div class="logs-list">
        ${
          logs.length
            ? logs
                .map((log) => {
                  const actionButtons =
                    log.type === "absence"
                      ? ` <div style="margin-top:8px"><button class="secondary-btn" data-log-action="toPresent" data-log-date="${log.date}" type="button">تحويل لحاضر</button> <button class="secondary-btn" data-log-action="toHalf" data-log-date="${log.date}" type="button">نصف شفت</button> <button class="danger-btn" data-log-action="delete" data-log-date="${log.date}" type="button">حذف</button></div>`
                      : ` <div style="margin-top:8px"><button class="danger-btn" data-log-action="delete" data-log-date="${log.date}" type="button">حذف</button></div>`;
                  return `<div class="log-item"><strong>${escapeHTML(log.date)}</strong> — ${escapeHTML(log.time || "-")} ${attendanceBadge(log)} ${log.note ? `<br>${escapeHTML(log.note)}` : ""}${actionButtons}</div>`;
                })
                .join("")
            : `<div class="log-item">لا توجد سجلات حضور.</div>`
        }
      </div>
    </div>
    <div class="details-section">
      <h3>قائمة السحوبات</h3>
      <div class="logs-list">
        ${withdrawals.length ? withdrawals.map((item) => `<div class="withdrawal-item"><strong>${money.format(Number(item.amount || 0))}</strong> — ${escapeHTML(item.date)}<br>${escapeHTML(item.reason || "بدون بيان")}</div>`).join("") : `<div class="withdrawal-item">لا توجد سحوبات لهذا الشهر.</div>`}
      </div>
    </div>
    <div class="details-section">
      <h3>قائمة الخصومات</h3>
      <div class="logs-list">
        ${deductions.length ? deductions.map((item) => `<div class="withdrawal-item"><strong>${money.format(Number(item.amount || 0))}</strong> — ${escapeHTML(item.date)}<br>${escapeHTML(item.reason || "خصم")} ${item.auto ? `<span class="badge">تلقائي</span>` : ""}</div>`).join("") : `<div class="withdrawal-item">لا توجد خصومات لهذا الشهر.</div>`}
      </div>
    </div>
    <div class="details-section">
      <h3>الملاحظات</h3>
      <div class="log-item">${escapeHTML(employee.notes || "لا توجد ملاحظات.")}</div>
    </div>`;
}

function handleEmployeeTableAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = event.target.closest("tr[data-id]");
  const id = row?.dataset.id;
  if (!id) return;

  if (button.dataset.action === "select") {
    state.selectedEmployeeId = id;
    renderDetails();
  }
  if (button.dataset.action === "edit") openEmployeeEditor(id);
  if (button.dataset.action === "delete") deleteEmployee(id);
}

function handleDetailsAction(event) {
  // support both main detail buttons and per-log action buttons
  const button = event.target.closest(
    "button[data-detail-action], button[data-log-action]",
  );
  if (!button) return;
  const employee = getSelectedEmployee();
  if (!employee) return;

  // detail actions (main buttons)
  const action = button.dataset.detailAction;
  if (action) {
    if (action === "checkin") return checkInEmployee(employee.id);
    if (action === "absence") return markAbsence(employee.id);
    if (action === "withdrawal") return openWithdrawalModal(employee.id);
    if (action === "deduction") return openDeductionModal(employee.id);
    if (action === "print" || action === "pdf")
      return printEmployeeReport(employee.id);
    return;
  }

  // per-log actions
  const logAction = button.dataset.logAction;
  const logDate = button.dataset.logDate;
  if (!logAction || !logDate) return;
  if (logAction === "delete")
    return removeAttendanceRecord(employee.id, logDate);
  if (logAction === "toPresent")
    return convertAbsenceToPresent(employee.id, logDate);
  if (logAction === "toHalf") return convertAbsenceToHalf(employee.id, logDate);
}

function hasAttendanceToday(employee) {
  return (employee.attendance || []).some((item) => item.date === todayISO());
}

function recordPresent(employee, date = todayISO(), note = "حضور جماعي") {
  if ((employee.attendance || []).some((item) => item.date === date))
    return false;
  const now = new Date();
  employee.attendance = employee.attendance || [];
  employee.attendance.push({
    id: uid(),
    date,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    type: "checkin",
    late: false,
    note,
  });
  return true;
}

function getAbsenceDeduction(employee) {
  const monthlySalary = Number(employee.salary || 0);
  return monthlySalary > 0 ? Math.round(monthlySalary / 30) : 0;
}

function recordAbsence(
  employee,
  date = todayISO(),
  note = "غياب جماعي تلقائي",
) {
  if ((employee.attendance || []).some((item) => item.date === date))
    return false;
  const absenceDeduction = getAbsenceDeduction(employee);
  if (absenceDeduction <= 0) return false;

  employee.absences = Number(employee.absences || 0) + 1;
  employee.attendance = employee.attendance || [];
  employee.attendance.push({
    id: uid(),
    date,
    time: "-",
    type: "absence",
    late: false,
    note,
  });
  addDeduction(
    employee,
    absenceDeduction,
    date,
    "خصم غياب تلقائي حسب الراتب اليومي",
    true,
  );
  return true;
}

function markAllEmployeesPresent() {
  if (!state.employees.length) {
    notify("لا يوجد موظفون لتسجيل حضورهم", "error");
    return;
  }

  const date = todayISO();
  let presentCount = 0;
  let skippedCount = 0;
  state.employees.forEach((employee) => {
    if (recordPresent(employee, date, "كل الموظفين حاضرين")) {
      presentCount += 1;
    } else {
      skippedCount += 1;
    }
  });

  addActivity(`تم تسجيل حضور جماعي لعدد ${presentCount} موظف`);
  saveData();
  notify(
    skippedCount
      ? `تم تسجيل ${presentCount} حاضر، وتم تجاهل ${skippedCount} مسجلين مسبقاً`
      : `تم تسجيل كل الموظفين حاضرين (${presentCount})`,
  );
}

function openBatchAttendanceModal() {
  if (!state.employees.length) {
    notify("لا يوجد موظفون لتحديد الحضور", "error");
    return;
  }

  els.batchAttendanceList.innerHTML = state.employees
    .map((employee) => {
      const registered = hasAttendanceToday(employee);
      return `<label class="attendance-check">
        <input type="checkbox" value="${employee.id}" ${registered ? "disabled" : ""} />
        <span>${escapeHTML(employee.name)}</span>
        ${registered ? `<small class="badge">مسجل اليوم</small>` : ""}
      </label>`;
    })
    .join("");
  els.batchAttendanceModal.showModal();
}

function handleBatchAttendanceSave(event) {
  event.preventDefault();
  const selectedIds = new Set(
    [...els.batchAttendanceList.querySelectorAll("input:checked")].map(
      (input) => input.value,
    ),
  );
  const date = todayISO();
  let presentCount = 0;
  let absentCount = 0;
  let skippedCount = 0;

  state.employees.forEach((employee) => {
    if (hasAttendanceToday(employee)) {
      skippedCount += 1;
      return;
    }
    if (selectedIds.has(employee.id)) {
      if (recordPresent(employee, date, "حضور محدد من الإدارة"))
        presentCount += 1;
    } else if (
      recordAbsence(employee, date, "غياب تلقائي - غير محدد ضمن الحاضرين")
    ) {
      absentCount += 1;
    }
  });

  addActivity(`تم تسجيل حضور محدد: ${presentCount} حاضر و ${absentCount} غائب`);
  els.batchAttendanceModal.close();
  saveData();
  notify(
    skippedCount
      ? `تم التسجيل: ${presentCount} حاضر، ${absentCount} غائب، وتجاهل ${skippedCount} مسجلين مسبقاً`
      : `تم التسجيل: ${presentCount} حاضر و ${absentCount} غائب`,
  );
}

function openEmployeeEditor(id = null) {
  const employee = id ? state.employees.find((item) => item.id === id) : null;
  els.modalTitle.textContent = employee ? "تعديل بيانات موظف" : "إضافة موظف";
  els.employeeId.value = employee?.id || "";
  els.employeeName.value = employee?.name || "";
  els.employeeSalary.value = employee?.salary || "";
  els.employeeDailySalary.value =
    calculateDefaultDailySalary(employee?.salary) || "";
  els.employeeStartDate.value = employee?.startDate || todayISO();
  els.employeeNotes.value = employee?.notes || "";
  els.employeeImage.value = "";
  els.employeeModal.showModal();
}

async function handleEmployeeSave(event) {
  event.preventDefault();
  const imageFile = els.employeeImage.files[0];
  const existing = state.employees.find(
    (employee) => employee.id === els.employeeId.value,
  );
  const image = imageFile
    ? await fileToDataURL(imageFile)
    : existing?.image || "";

  const payload = {
    id: existing?.id || uid(),
    name: els.employeeName.value.trim(),
    salary: Number(els.employeeSalary.value),
    dailySalary: calculateDefaultDailySalary(els.employeeSalary.value),
    startDate: els.employeeStartDate.value,
    image,
    notes: els.employeeNotes.value.trim(),
    absences: existing?.absences || 0,
    attendance: existing?.attendance || [],
    withdrawals: existing?.withdrawals || [],
    deductions: existing?.deductions || [],
    monthlyCycle: currentMonthKey(),
    createdAt: existing?.createdAt || new Date().toISOString(),
  };

  if (!payload.name || payload.salary < 0) {
    notify("يرجى إدخال اسم وراتب شهري صحيح", "error");
    return;
  }

  if (existing) {
    state.employees = state.employees.map((employee) =>
      employee.id === existing.id ? payload : employee,
    );
    addActivity(`تم تعديل بيانات الموظف ${payload.name}`);
  } else {
    state.employees.unshift(payload);
    state.selectedEmployeeId = payload.id;
    addActivity(`تمت إضافة الموظف ${payload.name}`);
  }

  els.employeeModal.close();
  saveData();
  notify("تم حفظ بيانات الموظف بنجاح");
}

function calculateDefaultDailySalary(salary) {
  const monthlySalary = Number(salary || 0);
  return monthlySalary > 0 ? Math.round(monthlySalary / 30) : "";
}

function deleteEmployee(id) {
  const employee = state.employees.find((item) => item.id === id);
  if (!employee) return;
  if (!confirm(`هل تريد حذف الموظف ${employee.name}؟`)) return;
  state.employees = state.employees.filter((item) => item.id !== id);
  if (state.selectedEmployeeId === id) state.selectedEmployeeId = null;
  addActivity(`تم حذف الموظف ${employee.name}`);
  saveData();
  notify("تم حذف الموظف");
}

function checkInEmployee(id) {
  const employee = state.employees.find((item) => item.id === id);
  if (!employee) return;
  const today = todayISO();
  const now = new Date();
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const isLate =
    now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);
  const todayLogs = (employee.attendance || []).filter(
    (item) => item.date === today,
  );
  const existing = todayLogs.find((item) => item.type === "checkin");
  const hasAbsence = todayLogs.find((item) => item.type === "absence");

  if (existing) {
    notify("تم تسجيل حضور هذا الموظف اليوم مسبقاً", "error");
    return;
  }
  if (hasAbsence) {
    notify("لا يمكن تسجيل حضور بعد تسجيل غياب لنفس اليوم", "error");
    return;
  }

  employee.attendance = employee.attendance || [];
  employee.attendance.push({
    id: uid(),
    date: today,
    time,
    type: "checkin",
    late: isLate,
    note: isLate ? "وصول متأخر" : "حضور ضمن الوقت",
  });

  if (isLate) {
    addDeduction(
      employee,
      CONFIG.lateDeduction,
      today,
      "خصم تأخير تلقائي",
      true,
    );
  }

  addActivity(`تم تسجيل حضور ${employee.name} الساعة ${time}`);
  saveData();
  notify(
    isLate
      ? `تم تسجيل الحضور وخصم ${money.format(CONFIG.lateDeduction)} للتأخير`
      : "تم تسجيل الحضور بنجاح",
  );
}

function markAbsence(id) {
  const employee = state.employees.find((item) => item.id === id);
  if (!employee) return;
  const today = todayISO();
  const todayLogs = (employee.attendance || []).filter(
    (item) => item.date === today,
  );
  const existing = todayLogs.find((item) => item.type === "absence");
  const hasCheckin = todayLogs.find((item) => item.type === "checkin");

  if (existing) {
    notify("تم تسجيل الغياب لهذا اليوم مسبقاً", "error");
    return;
  }
  if (hasCheckin) {
    notify("لا يمكن تسجيل غياب بعد تسجيل حضور لنفس اليوم", "error");
    return;
  }

  const absenceDeduction = getAbsenceDeduction(employee);
  if (absenceDeduction <= 0) {
    notify("يرجى تحديد الراتب اليومي للموظف قبل تسجيل الغياب", "error");
    return;
  }

  if (!recordAbsence(employee, today, "غياب")) {
    notify("تعذر تسجيل الغياب، تحقق من الراتب اليومي أو سجل اليوم", "error");
    return;
  }

  addActivity(`تم تسجيل غياب للموظف ${employee.name}`);
  saveData();
  notify(`تم تسجيل الغياب وخصم ${money.format(absenceDeduction)}`);
}

function openWithdrawalModal(id) {
  els.withdrawalEmployeeId.value = id;
  els.withdrawalAmount.value = "";
  els.withdrawalDate.value = todayISO();
  els.withdrawalReason.value = "";
  els.withdrawalModal.showModal();
}

function openDeductionModal(id) {
  els.deductionEmployeeId.value = id;
  els.deductionAmount.value = "";
  els.deductionDate.value = todayISO();
  els.deductionReason.value = "";
  els.deductionModal.showModal();
}

function handleDeductionSave(event) {
  event.preventDefault();
  const employee = state.employees.find(
    (item) => item.id === els.deductionEmployeeId.value,
  );
  if (!employee) return;

  const amount = Number(els.deductionAmount.value);
  const financial = getFinancials(employee);
  if (amount <= 0) {
    notify("يرجى إدخال مبلغ خصم صحيح", "error");
    return;
  }
  if (amount > financial.remaining) {
    notify("مبلغ الخصم أكبر من الراتب المتبقي", "error");
    return;
  }

  addDeduction(
    employee,
    amount,
    els.deductionDate.value,
    els.deductionReason.value.trim() || "خصم يدوي",
    false,
  );
  addActivity(`تم تسجيل خصم ${money.format(amount)} للموظف ${employee.name}`);
  els.deductionModal.close();
  saveData();
  notify("تمت إضافة الخصم واحتسابه من الراتب المتبقي");
}

function addDeduction(employee, amount, date, reason, auto = false) {
  employee.deductions = employee.deductions || [];
  employee.deductions.push({
    id: uid(),
    amount: Number(amount),
    date,
    reason,
    auto,
    createdAt: new Date().toISOString(),
  });
}

function removeAutoDeductionByDate(employee, date) {
  if (!employee.deductions) return false;
  const idx = employee.deductions.findIndex((d) => d.date === date && d.auto);
  if (idx === -1) return false;
  employee.deductions.splice(idx, 1);
  return true;
}

function removeAttendanceRecord(employeeId, date) {
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return;
  const idx = (employee.attendance || []).findIndex((a) => a.date === date);
  if (idx === -1) return notify("لم يتم العثور على السجل المحدد", "error");

  const rec = employee.attendance.splice(idx, 1)[0];
  if (rec.type === "absence") {
    employee.absences = Math.max(0, Number(employee.absences || 0) - 1);
    // remove corresponding auto deduction if exists
    removeAutoDeductionByDate(employee, date);
  }
  addActivity(`تم حذف سجل الحضور ${date} للموظف ${employee.name}`);
  saveData();
  notify("تم حذف السجل");
}

function convertAbsenceToPresent(employeeId, date) {
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return;
  const idx = (employee.attendance || []).findIndex(
    (a) => a.date === date && a.type === "absence",
  );
  if (idx === -1) return notify("لا يوجد غياب في هذا التاريخ", "error");

  // remove absence record
  employee.attendance.splice(idx, 1);
  employee.absences = Math.max(0, Number(employee.absences || 0) - 1);
  // remove auto deduction
  removeAutoDeductionByDate(employee, date);
  // add checkin
  const now = new Date();
  employee.attendance.push({
    id: uid(),
    date,
    time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
    type: "checkin",
    late: false,
    note: "تم تحويل الغياب إلى حضور",
  });
  addActivity(`تم تحويل غياب إلى حضور بتاريخ ${date} للموظف ${employee.name}`);
  saveData();
  notify("تم تعديل السجل بنجاح إلى حاضر");
}

function convertAbsenceToHalf(employeeId, date) {
  const employee = state.employees.find((e) => e.id === employeeId);
  if (!employee) return;
  const idx = (employee.attendance || []).findIndex(
    (a) => a.date === date && a.type === "absence",
  );
  if (idx === -1) return notify("لا يوجد غياب في هذا التاريخ", "error");

  // remove absence record
  employee.attendance.splice(idx, 1);
  employee.absences = Math.max(0, Number(employee.absences || 0) - 1);
  // remove full auto deduction if exists
  removeAutoDeductionByDate(employee, date);

  const half = Math.round((getAbsenceDeduction(employee) || 0) / 2);
  if (half > 0) {
    addDeduction(employee, half, date, "خصم نصف يوم تلقائي", true);
  }

  // add half attendance record
  employee.attendance.push({
    id: uid(),
    date,
    time: "نصف دوام",
    type: "half",
    late: false,
    note: "نصف شفت",
  });
  addActivity(
    `تم تحويل غياب إلى نصف شفت بتاريخ ${date} للموظف ${employee.name}`,
  );
  saveData();
  notify(`تم تعديل السجل إلى نصف شفت وخصم ${money.format(half)}`);
}

function handleWithdrawalSave(event) {
  event.preventDefault();
  const employee = state.employees.find(
    (item) => item.id === els.withdrawalEmployeeId.value,
  );
  if (!employee) return;

  const amount = Number(els.withdrawalAmount.value);
  const financial = getFinancials(employee);
  if (amount <= 0) {
    notify("يرجى إدخال مبلغ صحيح", "error");
    return;
  }
  if (amount > financial.remaining) {
    notify("المبلغ أكبر من الراتب المتبقي", "error");
    return;
  }

  employee.withdrawals = employee.withdrawals || [];
  employee.withdrawals.push({
    id: uid(),
    amount,
    date: els.withdrawalDate.value,
    reason: els.withdrawalReason.value.trim(),
    createdAt: new Date().toISOString(),
  });

  addActivity(`تم تسجيل سحب ${money.format(amount)} للموظف ${employee.name}`);
  els.withdrawalModal.close();
  saveData();
  notify("تمت إضافة السحب وخصمه من الراتب المتبقي");
}

function calculateTotals() {
  const salaries = state.employees.reduce(
    (sum, employee) => sum + Number(employee.salary || 0),
    0,
  );
  const withdrawals = state.employees.reduce(
    (sum, employee) => sum + getFinancials(employee).withdrawn,
    0,
  );
  const deductions = state.employees.reduce(
    (sum, employee) => sum + getFinancials(employee).deducted,
    0,
  );
  const today = todayISO();
  const absentToday = state.employees.filter((employee) =>
    (employee.attendance || []).some(
      (log) => log.date === today && log.type === "absence",
    ),
  ).length;
  return {
    salaries,
    withdrawals,
    deductions,
    remaining: salaries - withdrawals - deductions,
    absentToday,
  };
}

function getFinancials(employee) {
  const withdrawn = (employee.withdrawals || []).reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );
  const deducted = (employee.deductions || []).reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );
  const salary = Number(employee.salary || 0);
  const remaining = Math.max(salary - withdrawn - deducted, 0);
  return {
    withdrawn,
    deducted,
    remaining,
    salaryAfterDeductions: remaining,
  };
}

function getTodayAttendance(employee) {
  const today = todayISO();
  const logs = employee.attendance || [];
  return (
    logs.find((log) => log.date === today && log.type === "checkin") ||
    logs.find((log) => log.date === today && log.type === "absence")
  );
}

function getSelectedEmployee() {
  return (
    state.employees.find(
      (employee) => employee.id === state.selectedEmployeeId,
    ) || null
  );
}

function attendanceBadge(log) {
  if (log.type === "absence")
    return `<span class="status-badge danger">غائب</span>`;
  if (log.late) return `<span class="status-badge warning">متأخر</span>`;
  return `<span class="status-badge success">حاضر</span>`;
}

function renderAvatar(employee) {
  if (employee.image) {
    return `<img class="avatar" src="${employee.image}" alt="${escapeHTML(employee.name)}" />`;
  }
  return `<span class="avatar">${escapeHTML(employee.name?.trim()?.[0] || "م")}</span>`;
}

function drawSalaryChart() {
  const canvas = els.salaryChart;
  if (!canvas || !canvas.offsetParent) return;
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight || 180;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.scale(ratio, ratio);
  ctx.clearRect(0, 0, width, height);

  const totals = calculateTotals();
  const data = [
    { label: "الرواتب", value: totals.salaries, color: "#ffe2a3" },
    { label: "السحوبات", value: totals.withdrawals, color: "#ffbd59" },
    { label: "المتبقي", value: totals.remaining, color: "#55d68b" },
  ];
  const max = Math.max(...data.map((item) => item.value), 1);
  const barWidth = Math.min(92, width / 5);
  const gap = (width - barWidth * data.length) / (data.length + 1);

  ctx.font = "700 13px Cairo, sans-serif";
  ctx.textAlign = "center";
  data.forEach((item, index) => {
    const x = gap + index * (barWidth + gap);
    const barHeight = (height - 62) * (item.value / max);
    const y = height - 34 - barHeight;
    const gradient = ctx.createLinearGradient(0, y, 0, height);
    gradient.addColorStop(0, item.color);
    gradient.addColorStop(1, "rgba(216, 173, 85, 0.12)");
    roundRect(ctx, x, y, barWidth, barHeight, 14, gradient);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--muted");
    ctx.fillText(item.label, x + barWidth / 2, height - 12);
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue("--text");
    ctx.fillText(shortMoney(item.value), x + barWidth / 2, Math.max(18, y - 8));
  });
}

function roundRect(ctx, x, y, width, height, radius, fillStyle) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height);
  ctx.lineTo(x, y + height);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function shortMoney(value) {
  if (value >= 1000000) return `${Math.round(value / 1000000)}م`;
  if (value >= 1000) return `${Math.round(value / 1000)}أ`;
  return String(value);
}

function printEmployeesA4Table() {
  if (!state.employees.length) {
    notify("لا توجد بيانات موظفين للطباعة", "error");
    return;
  }

  const totals = state.employees.reduce(
    (summary, employee) => {
      const financial = getFinancials(employee);
      summary.salary += Number(employee.salary || 0);
      summary.absences += Number(employee.absences || 0);
      summary.withdrawn += financial.withdrawn;
      summary.deducted += financial.deducted;
      summary.remaining += financial.remaining;
      return summary;
    },
    { salary: 0, absences: 0, withdrawn: 0, deducted: 0, remaining: 0 },
  );

  const rows = state.employees
    .map((employee, index) => {
      const financial = getFinancials(employee);
      return `<tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(employee.name)}</td>
        <td>${money.format(Number(employee.salary || 0))}</td>
        <td>${money.format(getAbsenceDeduction(employee))}</td>
        <td>${employee.absences || 0}</td>
        <td>${money.format(financial.withdrawn)}</td>
        <td>${money.format(financial.deducted)}</td>
        <td>${money.format(financial.remaining)}</td>
      </tr>`;
    })
    .join("");

  const report = `
    <!doctype html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>جدول الموظفين A4</title>
      <style>
        @page { size: A4 landscape; margin: 5mm; }
        * { box-sizing: border-box; }
        html, body { width: 100%; min-height: 100%; }
        body { font-family: Arial, sans-serif; direction: rtl; color: #111; margin: 0; background: #fff; font-weight: 700; }
        .sheet { width: 100%; min-height: calc(210mm - 10mm); border: 3px solid #161006; padding: 6mm; }
        .header { display: flex; justify-content: space-between; align-items: center; gap: 18px; border-bottom: 4px solid #d8ad55; padding-bottom: 10px; margin-bottom: 12px; }
        .title-block { display: grid; gap: 4px; }
        h1 { margin: 0; font-size: 30px; line-height: 1.15; font-weight: 900; }
        h2 { margin: 0; font-size: 21px; color: #8b6426; font-weight: 900; }
        p { margin: 0; color: #4a3a17; font-size: 14px; font-weight: 800; }
        .header strong { font-size: 18px; font-weight: 900; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 14px; }
        th, td { border: 2px solid #8a7132; padding: 9px 6px; text-align: center; vertical-align: middle; overflow-wrap: anywhere; line-height: 1.45; font-weight: 800; }
        th { background: #161006; color: #fff8ea; font-weight: 900; font-size: 14.5px; }
        tbody tr:nth-child(even) { background: #fff3d2; }
        tbody td { min-height: 36px; }
        tfoot td { background: #ead08d; font-weight: 900; font-size: 14.5px; }
        .seq { width: 45px; }
        .name { width: 25%; font-size: 15px; font-weight: 900; }
        .money-col { width: 13%; }
        .absence-col { width: 7%; }
        .footer { margin-top: 14px; display: flex; justify-content: space-between; color: #3e3010; font-size: 14px; font-weight: 900; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <main class="sheet">
        <div class="header">
          <div class="title-block">
            <h1>مدينة العاب نور المقدادية</h1>
            <h2>سجل الموظفين الشهري</h2>
            <p>جدول بحجم ورقة A4 - ${arabicDate.format(new Date())}</p>
          </div>
          <strong>إدارة الموظفين</strong>
        </div>
        <table>
          <thead>
            <tr>
              <th class="seq">تسلسل</th>
              <th class="name">الاسم</th>
              <th class="money-col">الراتب الشهري</th>
                <th class="money-col">اليومي</th>
                <th class="absence-col">الغياب</th>
              <th class="money-col">السحب</th>
              <th class="money-col">الخصم</th>
              <th class="money-col">الراتب المتبقي</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2">الإجمالي</td>
              <td>${money.format(totals.salary)}</td>
              <td>-</td>
              <td>${totals.absences}</td>
              <td>${money.format(totals.withdrawn)}</td>
              <td>${money.format(totals.deducted)}</td>
              <td>${money.format(totals.remaining)}</td>
            </tr>
          </tfoot>
        </table>
        <div class="footer">
          <span>توقيع الإدارة: ____________________</span>
          <span>تاريخ الطباعة: ${new Date().toLocaleString("ar-IQ")}</span>
        </div>
      </main>
      <script>window.onload=()=>window.print();<\/script>
    </body>
    </html>`;

  els.printFrame.contentDocument.open();
  els.printFrame.contentDocument.write(report);
  els.printFrame.contentDocument.close();
  notify("تم تجهيز جدول A4 للطباعة");
}

function exportFullEmployeeCSV() {
  if (!state.employees.length) {
    notify("لا توجد بيانات موظفين للتصدير", "error");
    return;
  }

  const headers = [
    "تسلسل",
    "الاسم",
    "الراتب الشهري",
    "الراتب اليومي / خصم الغياب",
    "الغياب",
    "السحب",
    "الخصم",
    "الراتب المتبقي",
    "أول يوم عمل",
    "الملاحظات",
  ];
  const rows = state.employees.map((employee, index) => {
    const financial = getFinancials(employee);
    return [
      index + 1,
      employee.name,
      Number(employee.salary || 0),
      getAbsenceDeduction(employee),
      employee.absences || 0,
      financial.withdrawn,
      financial.deducted,
      financial.remaining,
      employee.startDate || "",
      employee.notes || "",
    ];
  });
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `employees-full-table-${todayISO()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  notify("تم تصدير السجل الكامل بصيغة CSV");
}

function backupData() {
  const blob = new Blob([localStorage.getItem(CONFIG.storageKey) || "{}"], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `employee-management-backup-${todayISO()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  notify("تم تحميل النسخة الاحتياطية");
}

function restoreData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed.employees)) throw new Error("Invalid backup");
      localStorage.setItem(CONFIG.storageKey, JSON.stringify(parsed));
      loadData();
      runMonthlyReset();
      renderAll();
      notify("تمت استعادة النسخة الاحتياطية بنجاح");
    } catch {
      notify("ملف النسخة الاحتياطية غير صالح", "error");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function clearAllData() {
  if (!confirm("سيتم حذف كل بيانات الموظفين نهائياً. هل أنت متأكد؟")) return;
  state.employees = [];
  state.activities = [];
  state.selectedEmployeeId = null;
  saveData();
  notify("تم مسح كل البيانات");
}

function seedDemoData() {
  if (
    state.employees.length &&
    !confirm("توجد بيانات حالية. هل تريد إضافة بيانات تجريبية فوقها؟")
  )
    return;
  const demos = [
    {
      name: "أحمد علي",
      salary: 1200000,
      dailySalary: 40000,
      startDate: "2024-01-15",
      notes: "مسؤول عمليات بخبرة عالية.",
    },
    {
      name: "سارة محمد",
      salary: 1500000,
      dailySalary: 50000,
      startDate: "2023-09-01",
      notes: "إدارة الحسابات والرواتب.",
    },
    {
      name: "حسين كريم",
      salary: 950000,
      dailySalary: 31667,
      startDate: "2024-03-10",
      notes: "متابعة الحضور واللوجستيات.",
    },
  ].map((employee) => ({
    id: uid(),
    ...employee,
    image: "",
    absences: 0,
    attendance: [],
    withdrawals: [],
    deductions: [],
    monthlyCycle: currentMonthKey(),
    createdAt: new Date().toISOString(),
  }));
  state.employees.unshift(...demos);
  state.selectedEmployeeId = demos[0].id;
  addActivity("تمت إضافة بيانات تجريبية للنظام");
  saveData();
  notify("تمت إضافة البيانات التجريبية");
}

function printEmployeeReport(id) {
  const employee = state.employees.find((item) => item.id === id);
  if (!employee) return;
  const financial = getFinancials(employee);
  const report = `
    <!doctype html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>تقرير ${escapeHTML(employee.name)}</title>
      <style>
        body{font-family:Arial,sans-serif;direction:rtl;padding:32px;color:#161006}
        .head{border-bottom:3px solid #d8ad55;padding-bottom:16px;margin-bottom:24px}
        h1{margin:0 0 8px}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:18px 0}
        .box{border:1px solid #d8ad55;border-radius:12px;padding:14px;background:#fff8ea}
        table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:10px;text-align:right}th{background:#161006;color:#fff8ea}
      </style>
    </head>
    <body>
      <div class="head"><h1>مدينة العاب نور المقدادية</h1><strong>تقرير إدارة الموظفين: ${escapeHTML(employee.name)}</strong><br><span>تاريخ التقرير: ${arabicDate.format(new Date())}</span></div>
      <div class="grid">
        <div class="box"><strong>الراتب الشهري</strong><br>${money.format(Number(employee.salary || 0))}</div>
        <div class="box"><strong>الراتب اليومي / خصم الغياب</strong><br>${money.format(getAbsenceDeduction(employee))}</div>
        <div class="box"><strong>إجمالي السحوبات</strong><br>${money.format(financial.withdrawn)}</div>
        <div class="box"><strong>إجمالي الخصومات</strong><br>${money.format(financial.deducted)}</div>
        <div class="box"><strong>الراتب المتبقي</strong><br>${money.format(financial.remaining)}</div>
        <div class="box"><strong>عدد الغيابات</strong><br>${employee.absences || 0}</div>
        <div class="box"><strong>أول يوم عمل</strong><br>${escapeHTML(employee.startDate || "-")}</div>
        <div class="box"><strong>الدورة الشهرية</strong><br>${currentMonthKey()}</div>
      </div>
      <h2>السحوبات</h2>
      <table><thead><tr><th>التاريخ</th><th>المبلغ</th><th>البيان</th></tr></thead><tbody>${(employee.withdrawals || []).map((item) => `<tr><td>${escapeHTML(item.date)}</td><td>${money.format(Number(item.amount || 0))}</td><td>${escapeHTML(item.reason || "-")}</td></tr>`).join("") || `<tr><td colspan="3">لا توجد سحوبات</td></tr>`}</tbody></table>
      <h2>الخصومات</h2>
      <table><thead><tr><th>التاريخ</th><th>المبلغ</th><th>السبب</th><th>النوع</th></tr></thead><tbody>${(employee.deductions || []).map((item) => `<tr><td>${escapeHTML(item.date)}</td><td>${money.format(Number(item.amount || 0))}</td><td>${escapeHTML(item.reason || "-")}</td><td>${item.auto ? "تلقائي" : "يدوي"}</td></tr>`).join("") || `<tr><td colspan="4">لا توجد خصومات</td></tr>`}</tbody></table>
      <h2>الحضور</h2>
      <table><thead><tr><th>التاريخ</th><th>الوقت</th><th>الحالة</th></tr></thead><tbody>${(employee.attendance || []).map((item) => `<tr><td>${escapeHTML(item.date)}</td><td>${escapeHTML(item.time || "-")}</td><td>${item.type === "absence" ? "غائب" : item.late ? "متأخر" : "حاضر"}</td></tr>`).join("") || `<tr><td colspan="3">لا توجد سجلات حضور</td></tr>`}</tbody></table>
      <script>window.onload=()=>window.print();<\/script>
    </body>
    </html>`;

  const frame = els.printFrame;
  frame.contentDocument.open();
  frame.contentDocument.write(report);
  frame.contentDocument.close();
  notify("تم فتح نافذة الطباعة، يمكنك اختيار Save as PDF");
}

function tickClock() {
  const now = new Date();
  if (els.dateLabel) els.dateLabel.textContent = arabicDate.format(now);
  if (els.clockLabel)
    els.clockLabel.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

function notify(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  if (type === "error") toast.style.borderColor = "rgba(255,95,99,.5)";
  els.toastHost.appendChild(toast);
  setTimeout(() => toast.remove(), 3600);
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatDateTime(value) {
  const date = new Date(value);
  return `${date.toLocaleDateString("ar-IQ")} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ========== Archive Render & PDF ==========
function renderArchives() {
  const container = document.getElementById("archivesContainer");
  if (!container) return;

  loadArchives();
  const years = getArchivedYears();

  if (years.length === 0) {
    container.innerHTML = `
      <div class="archive-empty">
        <div class="archive-empty-icon">📂</div>
        <h3>لا توجد أرشيفات بعد</h3>
        <p>ابدأ بإنشاء أرشيف للشهر الحالي أو سيتم إنشاؤه تلقائياً عند بداية شهر جديد.</p>
        <button class="primary-btn" onclick="archiveCurrentMonth()" type="button">
          أرشفة الشهر الحالي
        </button>
      </div>`;
    return;
  }

  const monthNames = {
    "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
    "05": "مايو", "06": "يونيو", "07": "يوليو", "08": "أغسطس",
    "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
  };

  container.innerHTML = years.map((year) => {
    const months = getArchivedMonths(year);
    const yearData = state.archives[year];
    const yearTotalSalary = months.reduce((sum, mk) => sum + (yearData[mk]?.totalSalary || 0), 0);
    const yearTotalRemaining = months.reduce((sum, mk) => sum + (yearData[mk]?.totalRemaining || 0), 0);

    return `
      <div class="archive-year-card glass-panel">
        <div class="archive-year-header">
          <div class="archive-year-title">
            <div class="archive-year-badge">${year}</div>
            <div>
              <h2>أرشيف سنة ${year}</h2>
              <span class="archive-year-stats">
                ${months.length} شهر محفوظ | إجمالي الرواتب: ${money.format(yearTotalSalary)} | المتبقي: ${money.format(yearTotalRemaining)}
              </span>
            </div>
          </div>
          <button class="primary-btn" onclick="archiveCurrentMonth()" type="button">
            + أرشفة الشهر الحالي
          </button>
        </div>
        <div class="archive-months-grid">
          ${months.map((mk) => {
            const monthNum = mk.split("-")[1];
            const data = yearData[mk];
            return `
              <div class="archive-month-card">
                <div class="archive-month-header">
                  <h3>${monthNames[monthNum] || monthNum} ${year}</h3>
                  <span class="archive-month-date">${mk}/1</span>
                </div>
                <div class="archive-month-stats">
                  <div class="archive-stat"><span>الموظفين</span><strong>${data.employeeCount}</strong></div>
                  <div class="archive-stat"><span>الرواتب</span><strong>${money.format(data.totalSalary)}</strong></div>
                  <div class="archive-stat"><span>السحوبات</span><strong>${money.format(data.totalWithdrawals)}</strong></div>
                  <div class="archive-stat"><span>الخصومات</span><strong>${money.format(data.totalDeductions)}</strong></div>
                  <div class="archive-stat"><span>المتبقي</span><strong>${money.format(data.totalRemaining)}</strong></div>
                  <div class="archive-stat"><span>الغيابات</span><strong>${data.totalAbsences}</strong></div>
                </div>
                <div class="archive-month-actions">
                  <button class="secondary-btn" onclick="printArchiveMonthPDF('${year}', '${mk}')" type="button">تصدير PDF</button>
                  <button class="danger-btn" onclick="deleteMonthlyArchive('${year}', '${mk}')" type="button">حذف</button>
                </div>
              </div>`;
          }).join("")}
        </div>
      </div>`;
  }).join("");
}

function printArchiveMonthPDF(year, monthKey) {
  const data = state.archives[year]?.[monthKey];
  if (!data) {
    notify("لم يتم العثور على بيانات الأرشيف", "error");
    return;
  }

  const monthNames = {
    "01": "يناير", "02": "فبراير", "03": "مارس", "04": "أبريل",
    "05": "مايو", "06": "يونيو", "07": "يوليو", "08": "أغسطس",
    "09": "سبتمبر", "10": "أكتوبر", "11": "نوفمبر", "12": "ديسمبر",
  };
  const monthNum = monthKey.split("-")[1];
  const monthName = monthNames[monthNum] || monthNum;

  const employeeRows = data.employees.map((emp, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHTML(emp.name)}</td>
      <td>${money.format(emp.salary)}</td>
      <td>${money.format(emp.dailySalary)}</td>
      <td>${emp.absences}</td>
      <td>${money.format(emp.financial.withdrawn)}</td>
      <td>${money.format(emp.financial.deducted)}</td>
      <td>${money.format(emp.financial.remaining)}</td>
    </tr>
    ${emp.withdrawals.length ? emp.withdrawals.map((w) => `
      <tr class="detail-row">
        <td colspan="2" style="padding-right:30px">↳ سحب: ${escapeHTML(w.reason || "بدون بيان")}</td>
        <td>${escapeHTML(w.date)}</td>
        <td>${money.format(w.amount)}</td>
        <td colspan="4"></td>
      </tr>`).join("") : ""}
    ${emp.deductions.length ? emp.deductions.map((d) => `
      <tr class="detail-row">
        <td colspan="2" style="padding-right:30px">↳ خصم: ${escapeHTML(d.reason || "خصم")} ${d.auto ? "(تلقائي)" : "(يدوي)"}</td>
        <td>${escapeHTML(d.date)}</td>
        <td>${money.format(d.amount)}</td>
        <td colspan="4"></td>
      </tr>`).join("") : ""}
    ${emp.attendance.length ? emp.attendance.slice(0, 5).map((a) => `
      <tr class="detail-row">
        <td colspan="2" style="padding-right:30px">↳ حضور: ${escapeHTML(a.date)} ${a.time || "-"} ${a.type === "absence" ? "غائب" : a.late ? "متأخر" : "حاضر"}</td>
        <td>${escapeHTML(a.date)}</td>
        <td>${a.note || ""}</td>
        <td colspan="4"></td>
      </tr>`).join("") : ""}
    ${emp.attendance.length > 5 ? `<tr class="detail-row"><td colspan="8" style="padding-right:30px;color:#8b6426">... و ${emp.attendance.length - 5} سجل حضور آخر</td></tr>` : ""}
  `).join("");

  const report = `
    <!doctype html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <title>أرشيف ${monthName} ${year} - مدينة العاب نور المقدادية</title>
      <style>
        @page { size: A4 landscape; margin: 5mm; }
        * { box-sizing: border-box; }
        html, body { width: 100%; min-height: 100%; }
        body { font-family: Arial, sans-serif; direction: rtl; color: #161006; margin: 0; background: #fff; font-weight: 700; }
        .sheet { width: 100%; min-height: calc(210mm - 10mm); border: 3px solid #161006; padding: 6mm; }
        .header { display: flex; justify-content: space-between; align-items: center; gap: 18px; border-bottom: 4px solid #d8ad55; padding-bottom: 10px; margin-bottom: 12px; }
        .title-block { display: grid; gap: 4px; }
        h1 { margin: 0; font-size: 28px; line-height: 1.15; font-weight: 900; }
        h2 { margin: 0; font-size: 20px; color: #8b6426; font-weight: 900; }
        p { margin: 0; color: #4a3a17; font-size: 13px; font-weight: 800; }
        .header strong { font-size: 16px; font-weight: 900; }
        .archive-badge { background: #161006; color: #fff8ea; padding: 8px 16px; border-radius: 8px; font-size: 18px; font-weight: 900; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 12px; margin-top: 10px; }
        th, td { border: 2px solid #8a7132; padding: 7px 5px; text-align: center; vertical-align: middle; overflow-wrap: anywhere; line-height: 1.4; font-weight: 800; }
        th { background: #161006; color: #fff8ea; font-weight: 900; font-size: 13px; }
        tbody tr:nth-child(even) { background: #fff3d2; }
        .detail-row { background: #faf0d8 !important; }
        .detail-row td { font-size: 11px; color: #6b5a2e; text-align: right; padding: 4px 5px; border-color: #c9b57a; }
        tfoot td { background: #ead08d; font-weight: 900; font-size: 13px; }
        .seq { width: 40px; }
        .name { width: 18%; font-size: 13px; font-weight: 900; }
        .money-col { width: 12%; }
        .absence-col { width: 6%; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 12px 0; }
        .summary-box { border: 2px solid #d8ad55; border-radius: 10px; padding: 10px; background: #fff8ea; text-align: center; }
        .summary-box strong { display: block; font-size: 16px; margin-top: 4px; }
        .summary-box span { font-size: 12px; color: #8b6426; }
        .footer { margin-top: 12px; display: flex; justify-content: space-between; color: #3e3010; font-size: 13px; font-weight: 900; }
        @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <main class="sheet">
        <div class="header">
          <div class="title-block">
            <h1>مدينة العاب نور المقدادية</h1>
            <h2>أرشيف الشهري - ${monthName} ${year}</h2>
            <p>تاريخ الأرشيف: ${new Date(data.createdAt).toLocaleDateString("ar-IQ")} | عدد الموظفين: ${data.employeeCount}</p>
          </div>
          <div class="archive-badge">${year}/${monthNum}/1</div>
        </div>
        <div class="summary-grid">
          <div class="summary-box"><span>إجمالي الرواتب</span><strong>${money.format(data.totalSalary)}</strong></div>
          <div class="summary-box"><span>إجمالي السحوبات</span><strong>${money.format(data.totalWithdrawals)}</strong></div>
          <div class="summary-box"><span>إجمالي الخصومات</span><strong>${money.format(data.totalDeductions)}</strong></div>
          <div class="summary-box"><span>إجمالي المتبقي</span><strong>${money.format(data.totalRemaining)}</strong></div>
        </div>
        <table>
          <thead>
            <tr>
              <th class="seq">ت</th>
              <th class="name">الاسم</th>
              <th class="money-col">الراتب</th>
              <th class="money-col">اليومي</th>
              <th class="absence-col">غياب</th>
              <th class="money-col">سحب</th>
              <th class="money-col">خصم</th>
              <th class="money-col">المتبقي</th>
            </tr>
          </thead>
          <tbody>${employeeRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="2">الإجمالي</td>
              <td>${money.format(data.totalSalary)}</td>
              <td>-</td>
              <td>${data.totalAbsences}</td>
              <td>${money.format(data.totalWithdrawals)}</td>
              <td>${money.format(data.totalDeductions)}</td>
              <td>${money.format(data.totalRemaining)}</td>
            </tr>
          </tfoot>
        </table>
        <div class="footer">
          <span>توقيع الإدارة: ____________________</span>
          <span>مدينة العاب نور المقدادية - أرشيف ${monthName} ${year}</span>
        </div>
      </main>
      <script>window.onload=()=>window.print();<\/script>
    </body>
    </html>`;

  const frame = els.printFrame;
  frame.contentDocument.open();
  frame.contentDocument.write(report);
  frame.contentDocument.close();
  notify(`تم فتح أرشيف ${monthName} ${year} للطباعة`);
}

boot();
