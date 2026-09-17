import { supabase } from "./supabase.js";

const greeting = document.querySelector("#home-greeting");
const taskCount = document.querySelector("#home-task-count");
const projectCount = document.querySelector("#home-project-count");
const knowledgeCount = document.querySelector("#home-knowledge-count");
const activityCount = document.querySelector("#home-activity-count");
const taskNote = document.querySelector("#home-task-note");
const taskList = document.querySelector("#home-task-list");

const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatDate = value => {
    if (!value) return "No due date";
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "No due date";
    return new Intl.DateTimeFormat(undefined, {
        month: "short",
        day: "numeric"
    }).format(date);
};

const getGreeting = name => {
    const hour = new Date().getHours();
    const period = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    return `${period}, ${name || "there"}.`;
};

function renderTasks(tasks) {
    if (!taskList) return;

    if (!tasks.length) {
        taskList.innerHTML = '<div class="kia-home-empty">No open tasks are assigned to you right now.</div>';
        return;
    }

    taskList.innerHTML = tasks.map(task => `
        <div class="kia-home-list-item">
            <div>
                <strong>${escapeHtml(task.title)}</strong>
                <small>${escapeHtml(task.project_name || "Workspace task")} · ${escapeHtml(formatDate(task.due_date))}</small>
            </div>
            <span class="kia-home-badge">${escapeHtml(task.status.replaceAll("_", " "))}</span>
        </div>
    `).join("");
}

async function loadHomeDashboard() {
    const { data: userResult, error: userError } = await supabase.auth.getUser();
    if (userError || !userResult?.user) {
        console.error("KIA Home could not load the authenticated user:", userError);
        return;
    }

    const user = userResult.user;

    const [
        profileResult,
        tasksResult,
        projectsResult,
        knowledgeResult,
        activityResult
    ] = await Promise.all([
        supabase
            .from("profiles")
            .select("full_name, staff_id")
            .eq("user_id", user.id)
            .maybeSingle(),
        supabase
            .from("tasks")
            .select("id, title, status, priority, due_date, project_id, projects(name)")
            .eq("assignee_id", user.id)
            .not("status", "in", "(completed,cancelled)")
            .order("due_date", { ascending: true, nullsFirst: false })
            .order("updated_at", { ascending: false })
            .limit(8),
        supabase
            .from("projects")
            .select("id, name, status")
            .eq("status", "active")
            .order("updated_at", { ascending: false })
            .limit(100),
        supabase
            .from("knowledge_documents")
            .select("id", { count: "exact", head: true })
            .eq("is_active", true),
        supabase
            .from("audit_logs")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    ]);

    if (profileResult.error) console.warn("KIA Home profile query:", profileResult.error.message);
    if (tasksResult.error) console.warn("KIA Home task query:", tasksResult.error.message);
    if (projectsResult.error) console.warn("KIA Home project query:", projectsResult.error.message);
    if (knowledgeResult.error) console.warn("KIA Home knowledge query:", knowledgeResult.error.message);
    if (activityResult.error) console.warn("KIA Home activity query:", activityResult.error.message);

    const profile = profileResult.data || {};
    const tasks = tasksResult.data || [];
    const projects = projectsResult.data || [];
    const projectCountValue = projectsResult.error ? 0 : projects.length;
    const knowledgeCountValue = knowledgeResult.error ? 0 : (knowledgeResult.count || 0);
    const activityCountValue = activityResult.error ? 0 : (activityResult.count || 0);

    const name = profile.full_name || user.user_metadata?.full_name || user.email?.split("@")[0] || "there";
    if (greeting) greeting.textContent = getGreeting(name);

    if (taskCount) taskCount.textContent = tasksResult.error ? "—" : String(tasks.length);
    if (projectCount) projectCount.textContent = String(projectCountValue);
    if (knowledgeCount) knowledgeCount.textContent = String(knowledgeCountValue);
    if (activityCount) activityCount.textContent = String(activityCountValue);

    if (taskNote) {
        taskNote.textContent = tasks.length === 1 ? "1 item needs attention" : `${tasks.length} items need attention`;
    }

    renderTasks(tasks.map(task => ({
        ...task,
        project_name: Array.isArray(task.projects) ? task.projects[0]?.name : task.projects?.name
    })));
}

loadHomeDashboard();
