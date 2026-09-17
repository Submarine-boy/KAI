import { supabase } from "./supabase.js";

const state = { user: null, isAdmin: false, projects: [], tasks: [], staff: [] };
const $ = (selector) => document.querySelector(selector);

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2600);
}

function escapeText(value) {
  return String(value ?? "").replace(/[&<>\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char]));
}

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
}

function switchView(view) {
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("active-view"));
  $(`#${view}-view`).classList.add("active-view");
  $("#page-title").textContent = view === "overview" ? "Workspace overview" : view[0].toUpperCase() + view.slice(1);
  $("#primary-action").hidden = true;
  if (view === "projects") { $("#primary-action").textContent = "New project"; $("#primary-action").hidden = false; }
  if (view === "tasks") { $("#primary-action").textContent = "New task"; $("#primary-action").hidden = false; }
}

async function getProfile() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw authError || new Error("No active session");
  state.user = user;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("user_id,staff_id,full_name,status,plan,department_id,role_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;

  const { data: admin, error: adminError } = await supabase.rpc("is_kia_admin");
  if (!adminError) state.isAdmin = admin === true;
  $("#staff-badge").textContent = `${profile?.staff_id || "Staff"} · ${profile?.status || "unknown"}`;
  return profile;
}

async function loadStaff() {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id,staff_id,full_name,status,department_id,role_id")
    .order("full_name", { ascending: true });
  if (error) throw error;
  state.staff = data || [];
  renderStaff();
}

async function loadProjects() {
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,description,status,owner_id,department_id,due_date,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  state.projects = data || [];
  renderProjects();
}

async function loadTasks() {
  const { data, error } = await supabase
    .from("tasks")
    .select("id,project_id,title,description,status,priority,assignee_id,due_date,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  state.tasks = data || [];
  renderTasks();
}

function renderStaff(filter = "") {
  const rows = state.staff.filter((person) => `${person.full_name || ""} ${person.staff_id || ""}`.toLowerCase().includes(filter.toLowerCase()));
  $("#staff-table").innerHTML = rows.map((person) => {
    const department = person.department_id ? "Assigned department" : "Unassigned";
    const role = person.role_id ? "Assigned role" : "Unassigned";
    return `<tr><td>${escapeText(person.staff_id || "—")}</td><td>${escapeText(person.full_name || "Unnamed staff")}</td><td class="muted">${department}</td><td class="muted">${role}</td><td><span class="status">${escapeText(person.status)}</span></td></tr>`;
  }).join("");
  $("#staff-empty").hidden = rows.length > 0;
  $("#metric-staff").textContent = state.staff.length;
}

function renderProjects() {
  $("#project-grid").innerHTML = state.projects.map((project) => `<article class="project-card"><p class="eyebrow">${escapeText(project.status)}</p><h3>${escapeText(project.name)}</h3><p>${escapeText(project.description || "No description provided.")}</p><div class="project-meta"><span>${project.due_date ? `Due ${escapeText(formatDate(project.due_date))}` : "No deadline"}</span><span>${escapeText(project.id.slice(0, 8))}</span></div></article>`).join("");
  $("#projects-empty").hidden = state.projects.length > 0;
  $("#metric-projects").textContent = state.projects.length;

  const select = $("#task-project");
  select.innerHTML = state.projects.map((project) => `<option value="${escapeText(project.id)}">${escapeText(project.name)}</option>`).join("");
}

function renderTasks() {
  const projectMap = new Map(state.projects.map((project) => [project.id, project.name]));
  const staffMap = new Map(state.staff.map((person) => [person.user_id, person.full_name || person.staff_id || "Staff"]));
  $("#task-table").innerHTML = state.tasks.map((task) => `<tr><td><strong>${escapeText(task.title)}</strong></td><td class="muted">${escapeText(projectMap.get(task.project_id) || "Project")}</td><td class="muted">${escapeText(staffMap.get(task.assignee_id) || (task.assignee_id === state.user?.id ? "You" : "Unassigned"))}</td><td><span class="priority">${escapeText(task.priority)}</span></td><td><span class="status">${escapeText(task.status.replaceAll("_", " "))}</span></td><td class="muted">${escapeText(formatDate(task.due_date))}</td></tr>`).join("");
  $("#tasks-empty").hidden = state.tasks.length > 0;
  $("#metric-tasks").textContent = state.tasks.filter((task) => task.status !== "completed" && task.status !== "cancelled").length;
  $("#metric-my-tasks").textContent = state.tasks.filter((task) => task.assignee_id === state.user?.id && task.status !== "completed" && task.status !== "cancelled").length;
}

async function createProject(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const { error } = await supabase.from("projects").insert({ name: values.name, description: values.description || null, due_date: values.due_date || null, owner_id: state.user.id, created_by: state.user.id });
  if (error) { showToast(error.message); return; }
  form.closest("dialog").close(); form.reset(); await loadProjects(); await loadTasks(); showToast("Project created");
}

async function createTask(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const { error } = await supabase.from("tasks").insert({ project_id: values.project_id, title: values.title, description: values.description || null, priority: values.priority, due_date: values.due_date || null, created_by: state.user.id });
  if (error) { showToast(error.message); return; }
  form.closest("dialog").close(); form.reset(); await loadTasks(); showToast("Task created");
}

async function refresh() {
  try {
    await getProfile();
    await Promise.all([loadStaff(), loadProjects(), loadTasks()]);
  } catch (error) {
    console.error("KIA workspace failed to load", error);
    showToast("Workspace data could not be loaded. Check access permissions.");
  }
}

document.querySelectorAll(".nav-item").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
$("#primary-action").addEventListener("click", () => { const active = document.querySelector(".nav-item.active")?.dataset.view; if (active === "projects") $("#project-dialog").showModal(); if (active === "tasks") $("#task-dialog").showModal(); });
$("#new-project").addEventListener("click", () => $("#project-dialog").showModal());
$("#new-task").addEventListener("click", () => { if (!state.projects.length) { showToast("Create a project first"); return; } $("#task-dialog").showModal(); });
$("#project-form").addEventListener("submit", createProject);
$("#task-form").addEventListener("submit", createTask);
$("#staff-search").addEventListener("input", (event) => renderStaff(event.target.value));
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => $("#" + button.dataset.close).close()));
$("#logout").addEventListener("click", async () => { await supabase.auth.signOut(); window.location.replace("login.html"); });

refresh();
