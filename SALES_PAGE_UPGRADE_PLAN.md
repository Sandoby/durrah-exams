# Sales Page Upgrade Plan - "Partner Pro Dashboard"

## 🎯 Objective
Transform the current basic sales page into a high-performance **Partner Pro Dashboard**. This will empower sales agents with real-time data, lead management tools, and professional outreach assets.

---

## 🚀 Phase 1: Real-time Performance Stats ✅
**Goal**: Provide immediate visibility into agent performance.

- [x] **Stats Overview Cards**:
    - **Total Signups**: Count of `sales_events` where type = 'signup'.
    - **Active Leads**: Count of `sales_leads` where status = 'new' or 'contacted'.
    - **Conversion Rate**: Percentage of leads that turned into signups.
- [x] **Activity Feed**:
    - A "Recent Activity" card showing the last 5 events (Signups, Leads, etc.).

---

## 📋 Phase 2: Lead Management (CRM Lite) ✅
**Goal**: Allow agents to manage their pipeline effectively.

- [x] **Leads Table**:
    - List all leads from `sales_leads` for the current agent.
    - Columns: Name, Email, Status, Created At, Actions.
- [x] **Quick Status Updates**:
    - Inline dropdown to change status: `New`, `Contacted`, `Won`, `Lost`.
- [x] **Lead Refresh**:
    - Manual refresh button for the leads list.

---

## ⚡ Phase 3: Advanced Outreach Tools ✅
**Goal**: Make sharing and pitching frictionless.

- [x] **Expanded Script Library**:
    - Categorized scripts: "Cold Outreach", "Follow-up", "Closing", "Objection Handling".
- [x] **Dynamic Link Builder**:
    - UTM preset buttons and copy-to-clipboard.
- [x] **Resource Hub**:
    - New "Marketing Resource Hub" section with download placeholders for PDF, MP4, ZIP.

---

## 🎨 Phase 4: UI/UX & Navigation (Partial)
**Goal**: Professional look and feel.

- [ ] **Sidebar Navigation**:
    - (Planned) Move to a sidebar-based layout for better organization.
- [x] **Visual Polish**:
    - Added Indigo/Slate/Emerald color coding for stats and statuses.
    - Added "Pro Tip" section for partner motivation.
- [x] **Mobile Optimization**:
    - Responsive grid and overflow-x for the leads table.

---

## 🛠 Technical Implementation Details

### 1. Data Fetching (Supabase)
```typescript
// Fetch Stats
const { data: signups } = await supabase
  .from('sales_events')
  .select('*', { count: 'exact', head: true })
  .eq('agent_id', agentId)
  .eq('type', 'signup');

// Fetch Leads
const { data: leads } = await supabase
  .from('sales_leads')
  .select('*')
  .eq('agent_id', agentId)
  .order('created_at', { ascending: false });
```

---

## 📅 Progress Summary
- **Phase 1-3**: Completed.
- **Phase 4**: UI Polish and Mobile optimization done. Sidebar navigation remains as a future enhancement.
