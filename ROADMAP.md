# ServiceSync ERP Progression Roadmap

**Vision**: Build ServiceSync to be better than Vision with full ERP capabilities

---

## ✅ Completed (Foundation)

### Authentication & Core Infrastructure
- [x] User authentication (JWT-based)
- [x] User registration with @icumechanical.com validation
- [x] Role-based permissions (admin, viewer, etc.)
- [x] WebSocket real-time updates
- [x] Database structure (PostgreSQL)

### Dispatch Board (Option A & Check-In/Out)
- [x] Enhanced DBoard with zones
- [x] Multi-tech columns with time slots
- [x] Drag-and-drop work order assignment
- [x] Parts Ordered queue
- [x] Ready to Schedule queue
- [x] Work order status tracking (Active, Suspended, Complete)
- [x] Work order assignments table (physical visits)
- [x] Tech check-in/check-out functionality
- [x] Status badges on cards
- [x] Carryover logic for suspended WOs

### Database Foundation
- [x] Customers table with zones
- [x] Work orders table with status/queue fields
- [x] Technicians table
- [x] Equipment table
- [x] Work order assignments table (visit tracking)
- [x] Service zones with boundaries
- [x] Vendors table
- [x] Purchase orders table
- [x] Work order line items (Register tab backend)
- [x] Invoices table

---

## 🚧 In Progress (Immediate Priorities)

### 1. Work Order Detail View ⭐ **CRITICAL**
**Why**: Core to daily operations, needed for Register/Attachments tabs

- [ ] Create comprehensive WO detail modal/page
- [ ] Tabs: Details, Register, Attachments, Assignments, Notes, History
- [ ] Register tab UI (labor, parts, materials with pricing)
- [ ] Attachments tab UI with image preview (fix Vision pain point!)
- [ ] Assignments tab UI (visit history)
- [ ] Notes/remarks editor (unlimited length)
- [ ] Quick actions (Complete, Suspend, Assign Tech)

**Files to create:**
- `WorkOrderDetailModal.tsx` or `WorkOrderDetailPage.tsx`
- `RegisterTab.tsx` - Line items editor
- `AttachmentsTab.tsx` - File upload with preview
- `AssignmentsTab.tsx` - Visit history display
- Backend: File upload endpoint (already exists, needs testing)

---

### 2. Customer Integration ⭐ **HIGH PRIORITY**
**Why**: WOs should be visible from customer records

- [ ] Fix customer work orders query to show all WOs
- [ ] Customer detail page shows all WOs (past, present, future)
- [ ] Filter by status (Open, In Progress, Suspended, Complete)
- [ ] Click WO to open detail view
- [ ] Create new WO from customer page

**Files to fix:**
- Customer work orders API endpoint
- `CustomerWorkOrders.tsx` or similar component
- Ensure proper JOIN and filtering

---

### 3. UI Polish & Fixes
- [ ] Hide tech name in Parts Ordered/Ready to Schedule queues
- [ ] Show "Original Tech" field separately from current assignment
- [ ] Add "Activated" status for WOs techs can check into
- [ ] Tech view: Show only their active/assigned WOs
- [ ] Tech view: Option to see their completed/suspended for reference

---

## 📋 Phase 2: Core Operations (Next 2-4 Weeks)

### Queue Management Interface
**Why**: Monitor work order flow, ensure nothing falls through cracks

- [ ] Sidebar or dedicated page for queues
- [ ] "Needs Parts" queue with counts
- [ ] "Needs Return Trip" queue
- [ ] Filter/search within queues
- [ ] Bulk actions (assign multiple WOs)
- [ ] Queue aging report (how long in queue)

### Parts Ordering Workflow
**Why**: Integrate parts ordering with work orders

- [ ] Create PO from work order (link to WO)
- [ ] Track PO status (Ordered, Received, Partial)
- [ ] Receive parts and auto-update WO status
- [ ] Move WO from Parts Ordered to Active when parts arrive
- [ ] Parts cost tracking for profitability

### Invoice Generation
**Why**: Bill customers, track revenue

- [ ] Generate invoice from completed WO
- [ ] Pull line items from Register tab
- [ ] Apply tax, discounts, payment terms
- [ ] PDF generation for customer
- [ ] QuickBooks integration hooks
- [ ] Payment tracking

---

## 📋 Phase 3: Advanced Features (1-2 Months)

### Scheduling & Calendar
- [ ] Calendar view for work orders
- [ ] Recurring service appointments
- [ ] Schedule optimization (route planning)
- [ ] Tech availability calendar
- [ ] Customer preferred time slots

### Reporting & Analytics
- [ ] Revenue by tech, customer, service type
- [ ] Work order completion rates
- [ ] Average time to complete by type
- [ ] Parts usage and profitability
- [ ] Customer billing reports
- [ ] Tech performance metrics

### Customer Portal
- [ ] Customers can view their WOs
- [ ] Approve quotes/estimates
- [ ] View invoices and pay online
- [ ] Service history
- [ ] Equipment records

### Mobile Tech App (Future)
- [ ] React Native or PWA for tablets
- [ ] Check-in/check-out from mobile
- [ ] View assigned WOs
- [ ] Add notes and photos
- [ ] Complete work orders
- [ ] Signature capture

---

## 📋 Phase 4: Full ERP Integration (3-6 Months)

### Inventory Management
- [ ] Parts inventory tracking
- [ ] Reorder points and alerts
- [ ] Vendor management
- [ ] Receive inventory from POs
- [ ] Track parts used per WO
- [ ] Physical inventory counts

### Equipment Management
- [ ] Equipment service history
- [ ] Maintenance schedules
- [ ] Warranty tracking
- [ ] Equipment-specific issues/patterns

### Advanced Accounting
- [ ] Job costing (actual vs estimated)
- [ ] Profitability by job, customer, tech
- [ ] Accounts receivable aging
- [ ] Payment processing
- [ ] QuickBooks sync (bidirectional)

### HR & Payroll Hooks
- [ ] Timesheet from check-in/check-out
- [ ] Overtime tracking
- [ ] Commission calculations
- [ ] Tech certifications tracking

---

## 🎯 Recommended Next Steps (This Week)

### Priority 1: Work Order Detail View
Start with a modal or page that shows comprehensive WO information:
1. Create `WorkOrderDetailModal.tsx`
2. Implement tabs structure
3. Build Register tab UI first (most critical for billing)
4. Add Attachments tab with preview
5. Add Assignments tab showing visit history

### Priority 2: Fix Customer Integration
1. Check customer WO API endpoint
2. Ensure all WOs for a customer are visible
3. Add filter by status
4. Link to WO detail view

### Priority 3: Polish DBoard
1. Hide tech name in queue sections
2. Add "Original Tech" tracking
3. Test check-in/check-out after pulling latest code

---

## 🔄 Continuous Improvements

### As We Build:
- Maintain Vision feature parity
- Exceed Vision capabilities (unlimited notes, image preview, etc.)
- Keep UI fast and responsive
- Real-time WebSocket updates
- Mobile-first design for tech tablet use

### Tech Debt to Avoid:
- Keep database normalized
- Use TypeScript strictly
- Write tests for critical paths
- Document API endpoints
- Keep components reusable

---

## 📊 Success Metrics

When can we say "ServiceSync is better than Vision"?

- ✅ All Vision features replicated
- ✅ Pain points fixed (image preview, character limits, etc.)
- ✅ Faster, more intuitive UI
- ✅ Real-time updates (no refresh needed)
- ✅ Mobile-friendly for techs
- ✅ Better reporting and analytics
- ✅ Office staff prefers ServiceSync
- ✅ Techs prefer ServiceSync
- ✅ Customers have better experience

---

## Questions to Clarify:

1. **Immediate**: Do techs need to see completed/suspended WOs or only active ones?
2. **Short-term**: Should "Original Tech" be tracked separately from current assignment?
3. **Medium-term**: Priority order for Register vs Attachments vs Assignments tabs?
4. **Long-term**: Mobile app or PWA for tech tablets?

---

**Last Updated**: December 19, 2025
**Current Phase**: Phase 1 (Foundation) → Moving to Phase 2 (Core Operations)
