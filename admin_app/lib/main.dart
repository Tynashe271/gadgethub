import 'dart:convert';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core.dart';

void main() => runApp(const AdminApp());

class AdminApp extends StatefulWidget {
  const AdminApp({super.key});
  @override
  State<AdminApp> createState() => _AdminAppState();
}

class _AdminAppState extends State<AdminApp> {
  final api = AdminApi();
  bool ready = false;
  bool entered = false;
  bool _wasSignedIn = false;
  @override
  void initState() {
    super.initState();
    api.addListener(_onApiChange);
    () async {
      await api.restore();
      if (mounted) setState(() => ready = true);
    }();
  }

  @override
  void dispose() {
    api.removeListener(_onApiChange);
    super.dispose();
  }

  void _onApiChange() {
    if (_wasSignedIn && !api.signedIn) setState(() => entered = false);
    _wasSignedIn = api.signedIn;
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
      animation: api,
      builder: (_, __) => MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'GadgetHub Admin',
          theme: adminTheme(api.darkMode ? Brightness.dark : Brightness.light),
          home: !ready
              ? const LoadingScreen()
              : !entered
                  ? LandingScreen(
                      onContinue: () => setState(() => entered = true))
                  : api.signedIn
                      ? AdminShell(api: api)
                      : LoginScreen(api: api)));
}

class LoadingScreen extends StatelessWidget {
  const LoadingScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
      backgroundColor: charcoal,
      body: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        Container(
            width: 72,
            height: 72,
            decoration:
                const BoxDecoration(color: lime, shape: BoxShape.circle),
            alignment: Alignment.center,
            child: const Text('G/H',
                style: TextStyle(
                    color: charcoal,
                    fontSize: 22,
                    fontWeight: FontWeight.w900))),
        const SizedBox(height: 24),
        const SizedBox(
            width: 26,
            height: 26,
            child: CircularProgressIndicator(strokeWidth: 2.6, color: lime)),
      ])));
}

class LandingScreen extends StatelessWidget {
  final VoidCallback onContinue;
  const LandingScreen({super.key, required this.onContinue});
  @override
  Widget build(BuildContext context) => Scaffold(
      backgroundColor: charcoal,
      body: SafeArea(
          child: Center(
              child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 420),
                  child: Padding(
                      padding: const EdgeInsets.all(28),
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Container(
                            width: 92,
                            height: 92,
                            decoration: const BoxDecoration(
                                color: lime, shape: BoxShape.circle),
                            alignment: Alignment.center,
                            child: const Text('G/H',
                                style: TextStyle(
                                    color: charcoal,
                                    fontSize: 28,
                                    fontWeight: FontWeight.w900))),
                        const SizedBox(height: 28),
                        const Text('Welcome to\nGadgetHub Admin.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                fontSize: 34,
                                height: .98,
                                letterSpacing: -1.2,
                                fontWeight: FontWeight.w900)),
                        const SizedBox(height: 14),
                        const Text(
                            'Commerce, inventory, customers and operations in one command center.',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                                color: Colors.grey, fontSize: 15, height: 1.5)),
                        const SizedBox(height: 30),
                        const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              _TrustBadge(
                                  icon: Icons.lock_outline,
                                  label: 'Secure access'),
                              SizedBox(width: 22),
                              _TrustBadge(
                                  icon: Icons.admin_panel_settings_outlined,
                                  label: 'Role-based'),
                              SizedBox(width: 22),
                              _TrustBadge(
                                  icon: Icons.fact_check_outlined,
                                  label: 'Audit logged'),
                            ]),
                        const SizedBox(height: 34),
                        SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                                onPressed: onContinue,
                                style: FilledButton.styleFrom(
                                    minimumSize: const Size(0, 52)),
                                child: const Text('Continue to sign in →'))),
                      ]))))));
}

class _TrustBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  const _TrustBadge({required this.icon, required this.label});
  @override
  Widget build(BuildContext context) => Column(children: [
        Icon(icon, color: lime, size: 20),
        const SizedBox(height: 6),
        Text(label,
            style: const TextStyle(
                fontSize: 10, color: Colors.grey, letterSpacing: .3))
      ]);
}

class LoginScreen extends StatefulWidget {
  final AdminApi api;
  const LoginScreen({super.key, required this.api});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final email = TextEditingController(), password = TextEditingController();
  bool loading = false, hidden = true;
  @override
  Widget build(BuildContext context) => Scaffold(
          body: Row(children: [
        if (MediaQuery.sizeOf(context).width > 850)
          Expanded(
              child: Container(
                  color: lime,
                  padding: const EdgeInsets.all(64),
                  child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.hub, size: 72, color: charcoal),
                        SizedBox(height: 30),
                        Text('CONTROL THE\nWHOLE HUB.',
                            style: TextStyle(
                                color: charcoal,
                                fontSize: 58,
                                height: .95,
                                fontWeight: FontWeight.w900)),
                        SizedBox(height: 20),
                        Text(
                            'Commerce, inventory, customers and operations in one command center.',
                            style: TextStyle(color: charcoal, fontSize: 18))
                      ]))),
        Expanded(
            child: Center(
                child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 460),
                    child: ListView(
                        shrinkWrap: true,
                        padding: const EdgeInsets.all(36),
                        children: [
                          const BrandMark(),
                          const SizedBox(height: 52),
                          const Text('Welcome back',
                              style: TextStyle(
                                  fontSize: 36, fontWeight: FontWeight.w900)),
                          const Text('Sign in with your staff account.',
                              style: TextStyle(color: Colors.grey)),
                          const SizedBox(height: 28),
                          TextField(
                              controller: email,
                              keyboardType: TextInputType.emailAddress,
                              decoration: const InputDecoration(
                                  labelText: 'Staff email',
                                  prefixIcon: Icon(Icons.mail_outline))),
                          const SizedBox(height: 14),
                          TextField(
                              controller: password,
                              obscureText: hidden,
                              onSubmitted: (_) => submit(),
                              decoration: InputDecoration(
                                  labelText: 'Password',
                                  prefixIcon: const Icon(Icons.lock_outline),
                                  suffixIcon: IconButton(
                                      onPressed: () =>
                                          setState(() => hidden = !hidden),
                                      icon: Icon(hidden
                                          ? Icons.visibility
                                          : Icons.visibility_off)))),
                          const SizedBox(height: 20),
                          FilledButton(
                              onPressed: loading ? null : submit,
                              child: Text(
                                  loading ? 'Signing in…' : 'Sign in securely'))
                        ]))))
      ]));
  Future<void> submit() async {
    if (email.text.trim().isEmpty || password.text.isEmpty) {
      return errorSnack(context, 'Enter your email and password');
    }
    setState(() => loading = true);
    try {
      await widget.api.login(email.text.trim(), password.text);
    } catch (e) {
      if (mounted) errorSnack(context, e);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }
}

class BrandMark extends StatelessWidget {
  const BrandMark({super.key});
  @override
  Widget build(BuildContext context) => const FittedBox(
      fit: BoxFit.scaleDown,
      alignment: Alignment.centerLeft,
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        CircleAvatar(
            backgroundColor: lime,
            foregroundColor: charcoal,
            child: Icon(Icons.hub)),
        SizedBox(width: 12),
        Text('GADGET',
            style: TextStyle(fontSize: 19, fontWeight: FontWeight.w900)),
        Text('HUB',
            style: TextStyle(
                fontSize: 19, color: lime, fontWeight: FontWeight.w900)),
        Text('  ADMIN',
            style:
                TextStyle(fontSize: 10, color: Colors.grey, letterSpacing: 2))
      ]));
}

class NavItem {
  final String label;
  final IconData icon;
  const NavItem(this.label, this.icon);
}

const navItems = [
  NavItem('Dashboard', Icons.space_dashboard_outlined),
  NavItem('Catalog', Icons.devices_other),
  NavItem('Inventory', Icons.inventory_2_outlined),
  NavItem('Orders', Icons.receipt_long_outlined),
  NavItem('Customers', Icons.people_outline),
  NavItem('Payments', Icons.account_balance_wallet_outlined),
  NavItem('Fulfilment', Icons.local_shipping_outlined),
  NavItem('Marketing', Icons.campaign_outlined),
  NavItem('Engagement', Icons.favorite_border),
  NavItem('Reports', Icons.query_stats),
  NavItem('Staff & security', Icons.admin_panel_settings_outlined),
  NavItem('Content', Icons.article_outlined),
  NavItem('System', Icons.monitor_heart_outlined),
  NavItem('Profile', Icons.person_outline),
];

class AdminShell extends StatefulWidget {
  final AdminApi api;
  const AdminShell({super.key, required this.api});
  @override
  State<AdminShell> createState() => _AdminShellState();
}

class _AdminShellState extends State<AdminShell> {
  int index = 0;
  final search = TextEditingController();
  List<dynamic> results = [];
  bool searching = false;
  Widget page() => [
        DashboardPage(api: widget.api, go: (i) => setState(() => index = i)),
        CatalogPage(api: widget.api),
        InventoryPage(api: widget.api),
        OrdersPage(api: widget.api),
        CustomersPage(api: widget.api),
        PaymentsPage(api: widget.api),
        FulfilmentPage(api: widget.api),
        MarketingPage(api: widget.api),
        EngagementPage(api: widget.api),
        ReportsPage(api: widget.api),
        StaffPage(api: widget.api),
        ContentPage(api: widget.api),
        SystemPage(api: widget.api),
        ProfilePage(api: widget.api)
      ][index];
  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 1000;
    return Scaffold(
      drawer: wide ? null : Drawer(child: nav()),
      body: SafeArea(
          child: Row(children: [
        if (wide) SizedBox(width: 245, child: nav()),
        Expanded(
            child: Column(children: [
          topBar(wide),
          if (widget.api.busy) const LinearProgressIndicator(minHeight: 2),
          Expanded(
              child: widget.api.error != null && widget.api.snapshot.isEmpty
                  ? ErrorView(api: widget.api)
                  : page())
        ]))
      ])),
    );
  }

  Widget nav() => Container(
      color: Theme.of(context).colorScheme.surface,
      padding: const EdgeInsets.fromLTRB(12, 22, 12, 14),
      child: Column(children: [
        const Padding(
            padding: EdgeInsets.symmetric(horizontal: 12), child: BrandMark()),
        const SizedBox(height: 25),
        Expanded(
          child: ListView.builder(
              itemCount: navItems.length,
              itemBuilder: (_, i) => Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: ListTile(
                      selected: index == i,
                      selectedTileColor: lime.withValues(alpha: .14),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                      leading: Icon(navItems[i].icon,
                          color: index == i ? lime : null),
                      title: Text(navItems[i].label,
                          style: TextStyle(
                              fontWeight: index == i ? FontWeight.bold : null)),
                      onTap: () {
                        setState(() => index = i);
                        if (Scaffold.of(context).hasDrawer &&
                            Navigator.canPop(context)) {
                          Navigator.pop(context);
                        }
                      }))),
        ),
        const Divider(),
        ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Sign out'),
            onTap: widget.api.logout)
      ]));
  Widget topBar(bool wide) => Padding(
      padding: const EdgeInsets.all(14),
      child: Row(children: [
        if (!wide)
          Builder(
              builder: (c) => IconButton(
                  onPressed: () => Scaffold.of(c).openDrawer(),
                  icon: const Icon(Icons.menu))),
        Expanded(
            child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 650),
                child: SearchAnchor(
                    viewHintText:
                        'Search products, orders, customers and transactions',
                    suggestionsBuilder: (_, controller) async {
                      if (controller.text.trim().isEmpty) {
                        return const [
                          ListTile(
                              leading: Icon(Icons.search),
                              title: Text('Type to search the whole hub'))
                        ];
                      }
                      try {
                        results = await widget.api.search(controller.text);
                        return results.map((r) => ListTile(
                            leading: Icon(iconFor('${r['_type']}')),
                            title: Text(rowTitle(r)),
                            subtitle: Text(
                                '${pretty('${r['_type']}')} · ${rowSubtitle(r)}')));
                      } catch (e) {
                        return [ListTile(title: Text(e.toString()))];
                      }
                    },
                    builder: (_, controller) => SearchBar(
                        controller: controller,
                        hintText: wide ? 'Global search…' : 'Search…',
                        leading: const Icon(Icons.search),
                        onTap: controller.openView,
                        onChanged: (_) => controller.openView())))),
        IconButton(
            tooltip: 'Refresh',
            onPressed: () => safe(context, widget.api.loadAll),
            icon: const Icon(Icons.refresh)),
        IconButton(
            tooltip: 'Theme',
            onPressed: widget.api.toggleTheme,
            icon: Icon(widget.api.darkMode
                ? Icons.light_mode_outlined
                : Icons.dark_mode_outlined)),
        const SizedBox(width: 5),
        CircleAvatar(
            backgroundColor: lime,
            foregroundColor: charcoal,
            child: Text('${widget.api.user?['firstName'] ?? 'A'}'[0]))
      ]));
}

class ErrorView extends StatelessWidget {
  final AdminApi api;
  const ErrorView({super.key, required this.api});
  @override
  Widget build(BuildContext context) => Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.cloud_off, size: 52),
        const SizedBox(height: 12),
        Text(api.error ?? 'Unable to load data'),
        const SizedBox(height: 12),
        FilledButton.icon(
            onPressed: () => safe(context, api.loadAll),
            icon: const Icon(Icons.refresh),
            label: const Text('Retry'))
      ]));
}

class PageFrame extends StatelessWidget {
  final String title, subtitle;
  final Widget child;
  final List<Widget> actions;
  const PageFrame(
      {super.key,
      required this.title,
      required this.subtitle,
      required this.child,
      this.actions = const []});
  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.fromLTRB(20, 14, 20, 40), children: [
        Wrap(alignment: WrapAlignment.spaceBetween, runSpacing: 10, children: [
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
                style:
                    const TextStyle(fontSize: 30, fontWeight: FontWeight.w900)),
            Text(subtitle, style: const TextStyle(color: Colors.grey))
          ]),
          Wrap(spacing: 8, children: actions)
        ]),
        const SizedBox(height: 22),
        child
      ]);
}

class DashboardPage extends StatelessWidget {
  final AdminApi api;
  final ValueChanged<int> go;
  const DashboardPage({super.key, required this.api, required this.go});
  @override
  Widget build(BuildContext context) {
    final m = api.metrics;
    final cards = [
      (
        'Today\'s Revenue',
        money(m['todayRevenue']),
        Icons.payments_outlined,
        Colors.green
      ),
      (
        'Today\'s Orders',
        '${m['todayOrders'] ?? 0}',
        Icons.shopping_bag_outlined,
        Colors.blue
      ),
      (
        'Pending Orders',
        '${m['pendingOrders'] ?? 0}',
        Icons.pending_actions,
        Colors.orange
      ),
      (
        'Low Stock',
        '${m['lowStock'] ?? 0}',
        Icons.inventory_2_outlined,
        Colors.amber
      ),
      (
        'Failed Payments',
        '${m['failedPayments'] ?? 0}',
        Icons.credit_card_off_outlined,
        Colors.red
      ),
      (
        'Active Returns',
        '${m['activeReturns'] ?? 0}',
        Icons.assignment_return_outlined,
        Colors.purple
      ),
      (
        'Warranty Claims',
        '${m['warrantyClaims'] ?? 0}',
        Icons.verified_user_outlined,
        Colors.teal
      ),
      (
        'Customers',
        '${m['customers'] ?? 0}',
        Icons.people_outline,
        Colors.indigo
      )
    ];
    return PageFrame(
        title: 'Command center',
        subtitle: 'Everything requiring attention, right now.',
        actions: [
          FilledButton.icon(
              onPressed: () => showQuickActions(context, api, go),
              icon: const Icon(Icons.bolt),
              label: const Text('Quick actions'))
        ],
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          LayoutBuilder(builder: (_, c) {
            final n = c.maxWidth > 1200
                ? 4
                : c.maxWidth > 650
                    ? 2
                    : 1;
            return GridView.count(
                crossAxisCount: n,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: n == 1 ? 3.7 : 2.15,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                children: cards
                    .map((x) => MetricCard(
                        label: x.$1, value: x.$2, icon: x.$3, color: x.$4))
                    .toList());
          }),
          const SizedBox(height: 24),
          ResponsivePair(
              left: Panel(
                  title: 'Revenue trend',
                  subtitle: 'Current 30-day sales activity',
                  child: SalesChart(rows: api.rows('orders'))),
              right: Panel(
                  title: 'Recent activity',
                  subtitle: 'Orders, payments and staff actions',
                  child: EntityList(rows: api.rows('activity'), max: 8))),
          const SizedBox(height: 16),
          ResponsivePair(
              left: Panel(
                  title: 'Inventory alerts',
                  subtitle: 'Low and out-of-stock variants',
                  child: EntityList(
                      rows: api
                          .rows('inventory')
                          .where((e) =>
                              (e['quantity'] ?? 0) - (e['reserved'] ?? 0) <=
                              (e['lowStockAt'] ?? 0))
                          .toList(),
                      max: 7)),
              right: Panel(
                  title: 'Financial summary',
                  subtitle: 'Live operational estimates',
                  child: KeyValues(values: {
                    'Revenue': money(m['totalRevenue']),
                    'Refunds': money(m['refunds']),
                    'Discounts': money(m['discounts']),
                    'Stock value': money(m['stockValue']),
                    'Estimated profit': money(m['estimatedProfit'])
                  })))
        ]));
  }
}

class CatalogPage extends StatelessWidget {
  final AdminApi api;
  const CatalogPage({super.key, required this.api});
  @override
  Widget build(BuildContext context) => PageFrame(
      title: 'Product catalog',
      subtitle:
          'Products, images, specifications, variants, brands and category hierarchy.',
      actions: [
        FilledButton.icon(
            onPressed: () => productDialog(context, api),
            icon: const Icon(Icons.add),
            label: const Text('Add product'))
      ],
      child: FeatureTabs(tabs: {
        'Products': EntityList(
            rows: api.rows('products'),
            actions: (r) => [
                  IconButton(
                      tooltip: 'Edit product',
                      onPressed: () => productDialog(context, api, existing: r),
                      icon: const Icon(Icons.edit_outlined)),
                  IconButton(
                      tooltip: 'Deactivate',
                      onPressed: () => confirmDelete(
                          context,
                          'Deactivate ${r['name']}?',
                          () => api.mutate('/products/${r['id']}',
                              method: 'DELETE')),
                      icon: const Icon(Icons.delete_outline))
                ]),
        'Variants': EntityList(
            rows: api
                .rows('products')
                .expand((p) => List<dynamic>.from(p['variants'] ?? []).map(
                    (v) => {
                          ...Map<String, dynamic>.from(v),
                          '_product': p['name']
                        }))
                .toList()),
        'Categories': EntityList(rows: api.rows('categories')),
        'Brands': EntityList(rows: api.rows('brands'))
      }));
}

class InventoryPage extends StatelessWidget {
  final AdminApi api;
  const InventoryPage({super.key, required this.api});
  @override
  Widget build(BuildContext context) => PageFrame(
      title: 'Inventory',
      subtitle:
          'Stock levels, movements, stock-in/out, low-stock and dead-stock monitoring.',
      actions: [
        FilledButton.icon(
            onPressed: () => inventoryDialog(context, api),
            icon: const Icon(Icons.sync_alt),
            label: const Text('Adjust stock'))
      ],
      child: FeatureTabs(tabs: {
        'All stock': EntityList(
            rows: api.rows('inventory'),
            actions: (r) => [
                  IconButton(
                      onPressed: () => inventoryDialog(context, api, row: r),
                      icon: const Icon(Icons.edit))
                ]),
        'Low stock': EntityList(
            rows: api
                .rows('inventory')
                .where((r) =>
                    (r['quantity'] ?? 0) - (r['reserved'] ?? 0) <=
                    (r['lowStockAt'] ?? 0))
                .toList()),
        'Out of stock': EntityList(
            rows: api
                .rows('inventory')
                .where((r) => (r['quantity'] ?? 0) <= 0)
                .toList()),
        'Movements': EntityList(
            rows: api
                .rows('inventory')
                .expand((r) => List<dynamic>.from(r['movements'] ?? []))
                .toList())
      }));
}

class OrdersPage extends StatelessWidget {
  final AdminApi api;
  const OrdersPage({super.key, required this.api});
  @override
  Widget build(BuildContext context) => PageFrame(
      title: 'Orders',
      subtitle:
          'Manage the full order lifecycle, timeline, invoices and receipts.',
      child: FeatureTabs(tabs: {
        'All orders': EntityList(
            rows: api.rows('orders'),
            actions: (r) => [
                  IconButton(
                      tooltip: 'Update status',
                      onPressed: () => orderStatusDialog(context, api, r),
                      icon: const Icon(Icons.update)),
                  IconButton(
                      tooltip: 'Invoice',
                      onPressed: () => showDetails(
                          context, 'Invoice ${r['orderNumber']}', r),
                      icon: const Icon(Icons.description_outlined))
                ]),
        for (final s in [
          'PLACED',
          'PAYMENT_CONFIRMED',
          'PREPARING',
          'DISPATCHED',
          'DELIVERED',
          'CANCELLED'
        ])
          pretty(s): EntityList(
              rows: api.rows('orders').where((r) => r['status'] == s).toList()),
        'Order timeline': EntityList(
            rows: api
                .rows('activity')
                .where((r) => r['type'] == 'ORDER')
                .toList()),
        'Invoices & receipts': EntityList(
            rows: api
                .rows('orders')
                .where((r) => List<dynamic>.from(r['payments'] ?? [])
                    .any((p) => p['status'] == 'PAID'))
                .toList())
      }));
}

class CustomersPage extends StatelessWidget {
  final AdminApi api;
  const CustomersPage({super.key, required this.api});
  @override
  Widget build(BuildContext context) {
    final customers =
        api.rows('users').where((u) => u['role'] == 'CUSTOMER').toList();
    return PageFrame(
        title: 'Customers',
        subtitle:
            'Profiles, addresses, account state, spending and purchase history.',
        child: FeatureTabs(tabs: {
          'Profiles': EntityList(
              rows: customers,
              actions: (r) => [
                    IconButton(
                        tooltip: 'View profile',
                        onPressed: () => showDetails(
                            context, '${r['firstName']} ${r['lastName']}', r),
                        icon: const Icon(Icons.open_in_new)),
                    Switch(
                        value: r['isActive'] == true,
                        onChanged: (v) => safe(
                            context,
                            () => api.mutate('/admin/users/${r['id']}',
                                method: 'PATCH', body: {'isActive': v})))
                  ]),
          'Purchase history': EntityList(rows: api.rows('orders')),
          'Top customers': EntityList(
              rows: [...customers]..sort((a, b) =>
                  ((b['_count']?['orders'] ?? 0) as int)
                      .compareTo((a['_count']?['orders'] ?? 0) as int))),
          'New & returning': CustomerAnalytics(rows: customers)
        }));
  }
}

class PaymentsPage extends StatelessWidget {
  final AdminApi api;
  const PaymentsPage({super.key, required this.api});
  @override
  Widget build(BuildContext context) => PageFrame(
      title: 'Payments & finance',
      subtitle:
          'Transactions, reconciliation, failed payments, refunds, receipts and fiscal records.',
      actions: [
        OutlinedButton.icon(
            onPressed: () => recordDialog(context, api, 'expenses', 'Expense'),
            icon: const Icon(Icons.add),
            label: const Text('Record expense')),
        FilledButton.icon(
            onPressed: () =>
                recordDialog(context, api, 'fiscal-records', 'Fiscal record'),
            icon: const Icon(Icons.receipt),
            label: const Text('Fiscal record'))
      ],
      child: FeatureTabs(tabs: {
        'Transactions': EntityList(rows: api.rows('payments')),
        'Reconciliation': Reconciliation(rows: api.rows('orders')),
        'Failed': EntityList(
            rows: api
                .rows('payments')
                .where((p) => p['status'] == 'FAILED')
                .toList()),
        'Refunds': EntityList(
            rows:
                api.rows('returns').where((r) => r['refund'] != null).toList()),
        'Receipts': EntityList(
            rows: api
                .rows('payments')
                .where((p) => p['status'] == 'PAID')
                .toList()),
        'Fiscalisation & tax': RecordsView(
            api: api, type: 'fiscal-records', label: 'Fiscal record'),
        'Expenses': RecordsView(api: api, type: 'expenses', label: 'Expense')
      }));
}

class FulfilmentPage extends StatelessWidget {
  final AdminApi api;
  const FulfilmentPage({super.key, required this.api});
  @override
  Widget build(BuildContext context) => PageFrame(
      title: 'Fulfilment & service',
      subtitle:
          'Delivery, returns, warranties, repairs, trade-ins, suppliers and purchasing.',
      child: FeatureTabs(tabs: {
        'Deliveries': EntityList(
            rows: api
                .rows('orders')
                .where((o) => o['delivery'] != null)
                .map((o) => {
                      ...Map<String, dynamic>.from(o['delivery']),
                      'orderNumber': o['orderNumber']
                    })
                .toList()),
        'Returns & refunds': EntityList(rows: api.rows('returns')),
        'Warranty claims': EntityList(rows: api.rows('warrantyClaims')),
        'Repairs': EntityList(rows: api.rows('repairs')),
        'Trade-ins': EntityList(rows: api.rows('tradeIns')),
        'Suppliers':
            RecordsView(api: api, type: 'suppliers', label: 'Supplier'),
        'Purchase orders': RecordsView(
            api: api, type: 'purchase-orders', label: 'Purchase order')
      }));
}

class MarketingPage extends StatelessWidget {
  final AdminApi api;
  const MarketingPage({super.key, required this.api});
  @override
  Widget build(BuildContext context) => PageFrame(
      title: 'Marketing',
      subtitle:
          'Coupons, flash sales, promotional banners and outbound campaigns.',
      child: FeatureTabs(tabs: {
        'Discounts & coupons': EntityList(rows: api.rows('coupons')),
        'Flash sales': EntityList(rows: api.rows('promotions')),
        'Promotional banners': EntityList(rows: api.rows('banners')),
        'Push notifications': EntityList(rows: api.rows('notifications')),
        'Email templates': RecordsView(
            api: api, type: 'email-templates', label: 'Email template'),
        'SMS templates':
            RecordsView(api: api, type: 'sms-templates', label: 'SMS template')
      }));
}

class EngagementPage extends StatelessWidget {
  final AdminApi api;
  const EngagementPage({super.key, required this.api});
  @override
  Widget build(BuildContext context) => PageFrame(
      title: 'Customer engagement',
      subtitle:
          'Reviews, wishlists, abandoned carts, price alerts and notifications.',
      child: FeatureTabs(tabs: {
        'Reviews & ratings': EntityList(
            rows: api.rows('reviews'),
            actions: (r) => [
                  IconButton(
                      tooltip: r['approved'] == true ? 'Hide' : 'Approve',
                      onPressed: () => safe(
                          context,
                          () => api.mutate('/reviews/${r['id']}/moderate',
                              method: 'PATCH',
                              body: {'approved': r['approved'] != true})),
                      icon: Icon(r['approved'] == true
                          ? Icons.visibility_off
                          : Icons.check))
                ]),
        'Wishlist analytics': EntityList(rows: api.rows('wishlists')),
        'Abandoned carts': EntityList(rows: api.rows('carts')),
        'Price-drop alerts': EntityList(rows: api.rows('priceAlerts')),
        'Notification center': EntityList(rows: api.rows('notifications'))
      }));
}

class ReportsPage extends StatelessWidget {
  final AdminApi api;
  const ReportsPage({super.key, required this.api});
  @override
  Widget build(BuildContext context) {
    final products = api.rows('products');
    final inventory = api.rows('inventory');
    return PageFrame(
        title: 'Reports & analytics',
        subtitle:
            'Sales, profit, products, customers, inventory and financial performance.',
        actions: [
          OutlinedButton.icon(
              onPressed: () => exportDialog(context, api),
              icon: const Icon(Icons.download),
              label: const Text('Export CSV')),
          FilledButton.icon(
              onPressed: () => importDialog(context, api),
              icon: const Icon(Icons.upload_file),
              label: const Text('Import'))
        ],
        child: FeatureTabs(tabs: {
          'Sales': SalesReport(api: api),
          'Profit': KeyValues(values: {
            'Revenue': money(api.metrics['totalRevenue']),
            'Estimated cost': money(api.metrics['estimatedCost']),
            'Refunds': money(api.metrics['refunds']),
            'Estimated profit': money(api.metrics['estimatedProfit'])
          }),
          'Best-selling': EntityList(
              rows: [...products]..sort((a, b) =>
                  ((b['_count']?['orderItems'] ?? 0) as int)
                      .compareTo((a['_count']?['orderItems'] ?? 0) as int))),
          'Slow-moving': EntityList(
              rows: products
                  .where((p) => (p['_count']?['orderItems'] ?? 0) == 0)
                  .toList()),
          'Customer analytics': CustomerAnalytics(
              rows: api
                  .rows('users')
                  .where((u) => u['role'] == 'CUSTOMER')
                  .toList()),
          'Inventory report': EntityList(rows: inventory),
          'Financial summary': KeyValues(
              values: api.metrics.map((k, v) => MapEntry(
                  pretty(k),
                  k.toLowerCase().contains('revenue') ||
                          [
                            'refunds',
                            'discounts',
                            'stockValue',
                            'estimatedCost',
                            'estimatedProfit'
                          ].contains(k)
                      ? money(v)
                      : '$v')))
        }));
  }
}

class StaffPage extends StatelessWidget {
  final AdminApi api;
  const StaffPage({super.key, required this.api});
  @override
  Widget build(BuildContext context) => PageFrame(
      title: 'Staff & security',
      subtitle:
          'Accounts, roles, permissions, sessions, login activity, 2FA policy and audit trail.',
      actions: [
        FilledButton.icon(
            onPressed: () => staffDialog(context, api),
            icon: const Icon(Icons.person_add),
            label: const Text('Create staff account'))
      ],
      child: FeatureTabs(tabs: {
        'Staff accounts': EntityList(
            rows: api
                .rows('users')
                .where((u) => u['role'] != 'CUSTOMER')
                .toList()),
        'Roles & permissions': const RoleMatrix(),
        'Audit logs': EntityList(rows: api.rows('auditLogs')),
        'Login activity': EntityList(rows: api.rows('sessions')),
        'Security settings': RecordsView(
            api: api, type: 'security-policies', label: 'Security policy')
      }));
}

class ContentPage extends StatelessWidget {
  final AdminApi api;
  const ContentPage({super.key, required this.api});
  @override
  Widget build(BuildContext context) => PageFrame(
      title: 'Support & content',
      subtitle:
          'Tickets, customer conversations, FAQs and published website pages.',
      child: FeatureTabs(tabs: {
        'Support tickets': EntityList(rows: api.rows('tickets')),
        'FAQ management': EntityList(rows: api.rows('faqs')),
        'Website content': EntityList(rows: api.rows('pages'))
      }));
}

class SystemPage extends StatelessWidget {
  final AdminApi api;
  const SystemPage({super.key, required this.api});
  @override
  Widget build(BuildContext context) => PageFrame(
      title: 'System & configuration',
      subtitle:
          'Store, payment, delivery, currency, backups, APIs, logs and data tools.',
      child: FeatureTabs(tabs: {
        'Store settings': RecordsView(
            api: api, type: 'store-settings', label: 'Store setting'),
        'Payment gateways':
            RecordsView(api: api, type: 'payment-gateways', label: 'Gateway'),
        'Delivery settings': EntityList(rows: api.rows('zones')),
        'Currency settings':
            RecordsView(api: api, type: 'currency-settings', label: 'Currency'),
        'Backup & restore':
            RecordsView(api: api, type: 'backups', label: 'Backup'),
        'API status': ApiStatus(api: api),
        'System logs': EntityList(
            rows: [...api.rows('webhooks'), ...api.rows('auditLogs')]),
        'Bulk actions': BulkActions(api: api)
      }));
}

class ProfilePage extends StatelessWidget {
  final AdminApi api;
  const ProfilePage({super.key, required this.api});
  @override
  Widget build(BuildContext context) {
    final u = api.user ?? {};
    return PageFrame(
        title: 'Admin profile',
        subtitle:
            'Your identity, contact details, password and display preferences.',
        child: Center(
            child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 650),
                child: Panel(
                    title: '${u['firstName']} ${u['lastName']}',
                    subtitle: '${u['role']}',
                    child: Column(children: [
                      CircleAvatar(
                          radius: 42,
                          backgroundColor: lime,
                          foregroundColor: charcoal,
                          child: Text('${u['firstName'] ?? 'A'}'[0],
                              style: const TextStyle(
                                  fontSize: 32, fontWeight: FontWeight.bold))),
                      const SizedBox(height: 16),
                      KeyValues(values: {
                        'Email': '${u['email']}',
                        'Phone': '${u['phone'] ?? 'Not set'}',
                        'Role': pretty('${u['role']}')
                      }),
                      const SizedBox(height: 16),
                      SwitchListTile(
                          value: api.darkMode,
                          onChanged: (_) => api.toggleTheme(),
                          title: const Text('Dark mode'),
                          secondary: const Icon(Icons.dark_mode)),
                      ListTile(
                          leading: const Icon(Icons.password),
                          title: const Text('Change password'),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => passwordDialog(context, api)),
                      ListTile(
                          leading: const Icon(Icons.logout),
                          title: const Text('Sign out'),
                          onTap: api.logout)
                    ])))));
  }
}

class MetricCard extends StatelessWidget {
  final String label, value;
  final IconData icon;
  final Color color;
  const MetricCard(
      {super.key,
      required this.label,
      required this.value,
      required this.icon,
      required this.color});
  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(children: [
            Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                    color: color.withValues(alpha: .15),
                    borderRadius: BorderRadius.circular(13)),
                child: Icon(icon, color: color)),
            const SizedBox(width: 14),
            Expanded(
                child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                  Text(value,
                      maxLines: 1,
                      style: const TextStyle(
                          fontSize: 24, fontWeight: FontWeight.w900)),
                  Text(label, style: const TextStyle(color: Colors.grey))
                ]))
          ])));
}

class Panel extends StatelessWidget {
  final String title, subtitle;
  final Widget child;
  const Panel(
      {super.key,
      required this.title,
      required this.subtitle,
      required this.child});
  @override
  Widget build(BuildContext context) => Card(
      child: Padding(
          padding: const EdgeInsets.all(18),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title,
                style:
                    const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            Text(subtitle,
                style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 16),
            child
          ])));
}

class ResponsivePair extends StatelessWidget {
  final Widget left, right;
  const ResponsivePair({super.key, required this.left, required this.right});
  @override
  Widget build(BuildContext context) => LayoutBuilder(
      builder: (_, c) => c.maxWidth > 800
          ? Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: left),
              const SizedBox(width: 16),
              Expanded(child: right)
            ])
          : Column(children: [left, const SizedBox(height: 16), right]));
}

class FeatureTabs extends StatelessWidget {
  final Map<String, Widget> tabs;
  const FeatureTabs({super.key, required this.tabs});
  @override
  Widget build(BuildContext context) => DefaultTabController(
      length: tabs.length,
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: tabs.keys.map((e) => Tab(text: e)).toList()),
        const SizedBox(height: 16),
        SizedBox(
            height: math.max(460, MediaQuery.sizeOf(context).height - 230),
            child: TabBarView(
                children: tabs.values
                    .map((e) => SingleChildScrollView(child: e))
                    .toList()))
      ]));
}

class EntityList extends StatefulWidget {
  final List<dynamic> rows;
  final int? max;
  final List<Widget> Function(dynamic row)? actions;
  const EntityList({super.key, required this.rows, this.max, this.actions});
  @override
  State<EntityList> createState() => _EntityListState();
}

class _EntityListState extends State<EntityList> {
  String query = '';
  @override
  Widget build(BuildContext context) {
    var data = widget.rows
        .where((r) => jsonText(r).toLowerCase().contains(query.toLowerCase()))
        .toList();
    if (widget.max != null) data = data.take(widget.max!).toList();
    return Column(children: [
      if (widget.max == null && widget.rows.length > 6)
        Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: TextField(
                decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.filter_list),
                    labelText: 'Filter these records'),
                onChanged: (v) => setState(() => query = v))),
      if (data.isEmpty) const EmptyState(),
      ...data.map((r) => Card(
          child: ListTile(
              onTap: () => showDetails(context, rowTitle(r), r),
              leading: CircleAvatar(
                  backgroundColor: statusColor('${r['status'] ?? ''}')
                      .withValues(alpha: .16),
                  child: Icon(iconFor('${r['_type'] ?? r['type'] ?? ''}'),
                      color: statusColor('${r['status'] ?? ''}'))),
              title: Text(rowTitle(r),
                  maxLines: 1, overflow: TextOverflow.ellipsis),
              subtitle: Text(rowSubtitle(r),
                  maxLines: 2, overflow: TextOverflow.ellipsis),
              trailing: widget.actions == null
                  ? StatusChip('${r['status'] ?? r['role'] ?? ''}')
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: widget.actions!(r)))))
    ]);
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({super.key});
  @override
  Widget build(BuildContext context) => const Padding(
      padding: EdgeInsets.all(45),
      child: Column(children: [
        Icon(Icons.inbox_outlined, size: 44, color: Colors.grey),
        SizedBox(height: 10),
        Text('No records yet', style: TextStyle(color: Colors.grey))
      ]));
}

class StatusChip extends StatelessWidget {
  final String value;
  const StatusChip(this.value, {super.key});
  @override
  Widget build(BuildContext context) => value.isEmpty
      ? const SizedBox.shrink()
      : Container(
          padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
          decoration: BoxDecoration(
              color: statusColor(value).withValues(alpha: .14),
              borderRadius: BorderRadius.circular(20)),
          child: Text(pretty(value),
              style: TextStyle(
                  fontSize: 10,
                  color: statusColor(value),
                  fontWeight: FontWeight.bold)));
}

class KeyValues extends StatelessWidget {
  final Map<String, String> values;
  const KeyValues({super.key, required this.values});
  @override
  Widget build(BuildContext context) => Column(
      children: values.entries
          .map((e) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Row(children: [
                Expanded(
                    child: Text(e.key,
                        style: const TextStyle(color: Colors.grey))),
                Text(e.value,
                    style: const TextStyle(fontWeight: FontWeight.bold))
              ])))
          .toList());
}

class RecordsView extends StatefulWidget {
  final AdminApi api;
  final String type, label;
  const RecordsView(
      {super.key, required this.api, required this.type, required this.label});
  @override
  State<RecordsView> createState() => _RecordsViewState();
}

class _RecordsViewState extends State<RecordsView> {
  List<dynamic> rows = [];
  bool loading = true;
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    try {
      rows = List<dynamic>.from(
          await widget.api.call('/admin-console/records/${widget.type}'));
    } catch (e) {
      if (mounted) errorSnack(context, e);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(children: [
        Align(
            alignment: Alignment.centerRight,
            child: FilledButton.icon(
                onPressed: () async {
                  await recordDialog(
                      context, widget.api, widget.type, widget.label);
                  await load();
                },
                icon: const Icon(Icons.add),
                label: Text('Add ${widget.label}'))),
        const SizedBox(height: 12),
        if (loading)
          const LinearProgressIndicator()
        else
          EntityList(
              rows: rows,
              actions: (r) => [
                    IconButton(
                        onPressed: () async {
                          await recordDialog(
                              context, widget.api, widget.type, widget.label,
                              existing: r);
                          await load();
                        },
                        icon: const Icon(Icons.edit_outlined)),
                    IconButton(
                        onPressed: () async {
                          await confirmDelete(
                              context,
                              'Delete this ${widget.label.toLowerCase()}?',
                              () => widget.api
                                  .deleteRecord(widget.type, '${r['id']}'));
                          await load();
                        },
                        icon: const Icon(Icons.delete_outline))
                  ])
      ]);
}

class SalesChart extends StatelessWidget {
  final List<dynamic> rows;
  const SalesChart({super.key, required this.rows});
  @override
  Widget build(BuildContext context) {
    final values = rows
        .take(14)
        .map((e) => num.tryParse('${e['total']}')?.toDouble() ?? 0)
        .toList()
        .reversed
        .toList();
    return SizedBox(
        height: 185,
        width: double.infinity,
        child: CustomPaint(
            painter: ChartPainter(values.isEmpty ? [0, 0] : values,
                Theme.of(context).colorScheme.primary)));
  }
}

class ChartPainter extends CustomPainter {
  final List<double> values;
  final Color color;
  ChartPainter(this.values, this.color);
  @override
  void paint(Canvas canvas, Size size) {
    final grid = Paint()
      ..color = Colors.grey.withValues(alpha: .15)
      ..strokeWidth = 1;
    for (var i = 0; i < 5; i++) {
      final y = size.height * i / 4;
      canvas.drawLine(Offset(0, y), Offset(size.width, y), grid);
    }
    final maxV = values.reduce(math.max);
    final path = Path();
    for (var i = 0; i < values.length; i++) {
      final x = values.length == 1 ? 0.0 : size.width * i / (values.length - 1);
      final y = size.height -
          (maxV == 0 ? 0.0 : values[i] / maxV * size.height * .86) -
          8;
      i == 0 ? path.moveTo(x, y) : path.lineTo(x, y);
    }
    canvas.drawPath(
        path,
        Paint()
          ..color = color
          ..strokeWidth = 3
          ..style = PaintingStyle.stroke
          ..strokeCap = StrokeCap.round);
  }

  @override
  bool shouldRepaint(covariant ChartPainter old) => old.values != values;
}

class SalesReport extends StatelessWidget {
  final AdminApi api;
  const SalesReport({super.key, required this.api});
  @override
  Widget build(BuildContext context) => Column(children: [
        ResponsivePair(
            left: MetricCard(
                label: 'Total revenue',
                value: money(api.metrics['totalRevenue']),
                icon: Icons.trending_up,
                color: Colors.green),
            right: MetricCard(
                label: 'Total orders',
                value: '${api.metrics['totalOrders'] ?? 0}',
                icon: Icons.receipt,
                color: Colors.blue)),
        const SizedBox(height: 16),
        Panel(
            title: 'Sales chart',
            subtitle: 'Recent order value',
            child: SalesChart(rows: api.rows('orders')))
      ]);
}

class CustomerAnalytics extends StatelessWidget {
  final List<dynamic> rows;
  const CustomerAnalytics({super.key, required this.rows});
  @override
  Widget build(BuildContext context) {
    final cutoff = DateTime.now().subtract(const Duration(days: 30));
    final recent = rows
        .where((u) =>
            DateTime.tryParse('${u['createdAt']}')?.isAfter(cutoff) == true)
        .length;
    final returning =
        rows.where((u) => (u['_count']?['orders'] ?? 0) > 1).length;
    return KeyValues(values: {
      'Total customers': '${rows.length}',
      'New (30 days)': '$recent',
      'Returning customers': '$returning',
      'Active accounts': '${rows.where((u) => u['isActive'] == true).length}'
    });
  }
}

class Reconciliation extends StatelessWidget {
  final List<dynamic> rows;
  const Reconciliation({super.key, required this.rows});
  @override
  Widget build(BuildContext context) {
    final mismatches = rows.where((o) {
      final paid = List<dynamic>.from(o['payments'] ?? [])
          .where((p) => p['status'] == 'PAID')
          .fold<double>(0, (s, p) => s + (num.tryParse('${p['amount']}') ?? 0));
      return (paid - (num.tryParse('${o['total']}') ?? 0)).abs() > .01;
    }).toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      KeyValues(values: {
        'Orders checked': '${rows.length}',
        'Reconciliation exceptions': '${mismatches.length}',
        'Matched': '${rows.length - mismatches.length}'
      }),
      const SizedBox(height: 12),
      EntityList(rows: mismatches)
    ]);
  }
}

class RoleMatrix extends StatelessWidget {
  const RoleMatrix({super.key});
  @override
  Widget build(BuildContext context) {
    const roles = {
      'SUPER_ADMIN': 'All settings, staff and operations',
      'STORE_MANAGER': 'Commerce and operational management',
      'PRODUCT': 'Products, brands and categories',
      'INVENTORY': 'Stock and inventory movements',
      'ORDER': 'Orders, payments and returns',
      'DELIVERY': 'Delivery and order status',
      'SUPPORT': 'Tickets, reviews and customer support'
    };
    return KeyValues(values: roles);
  }
}

class ApiStatus extends StatelessWidget {
  final AdminApi api;
  const ApiStatus({super.key, required this.api});
  @override
  Widget build(BuildContext context) => FutureBuilder(
      future: api.call('/health'),
      builder: (_, s) => s.connectionState != ConnectionState.done
          ? const LinearProgressIndicator()
          : s.hasError
              ? ListTile(
                  leading: const Icon(Icons.error, color: Colors.red),
                  title: const Text('API unavailable'),
                  subtitle: Text('${s.error}'))
              : Column(children: [
                  const ListTile(
                      leading: Icon(Icons.check_circle, color: Colors.green),
                      title: Text('Backend API operational')),
                  EntityList(
                      rows: [Map<String, dynamic>.from(s.data as dynamic)])
                ]));
}

class BulkActions extends StatelessWidget {
  final AdminApi api;
  const BulkActions({super.key, required this.api});
  @override
  Widget build(BuildContext context) =>
      Wrap(spacing: 10, runSpacing: 10, children: [
        OutlinedButton.icon(
            onPressed: () => bulkDialog(context, api, 'products', 'price'),
            icon: const Icon(Icons.price_change),
            label: const Text('Update product prices')),
        OutlinedButton.icon(
            onPressed: () => bulkDialog(context, api, 'products', 'category'),
            icon: const Icon(Icons.category),
            label: const Text('Change categories')),
        OutlinedButton.icon(
            onPressed: () => bulkDialog(context, api, 'inventory', 'stock'),
            icon: const Icon(Icons.inventory),
            label: const Text('Adjust stock')),
        OutlinedButton.icon(
            onPressed: () => bulkDialog(context, api, 'products', 'active'),
            icon: const Icon(Icons.toggle_on),
            label: const Text('Change product status')),
        OutlinedButton.icon(
            onPressed: () => exportDialog(context, api),
            icon: const Icon(Icons.download),
            label: const Text('Export data')),
        OutlinedButton.icon(
            onPressed: () => importDialog(context, api),
            icon: const Icon(Icons.upload),
            label: const Text('Import data')),
      ]);
}

Future<void> safe(BuildContext context, Future<void> Function() action) async {
  try {
    await action();
  } catch (e) {
    if (context.mounted) errorSnack(context, e);
  }
}

String jsonText(dynamic value) {
  try {
    return '$value';
  } catch (_) {
    return '';
  }
}

String rowTitle(dynamic r) =>
    '${r['name'] ?? r['title'] ?? r['orderNumber'] ?? r['ticketNumber'] ?? r['code'] ?? r['email'] ?? r['sku'] ?? r['subject'] ?? r['deviceModel'] ?? r['reference'] ?? r['action'] ?? r['type'] ?? r['id'] ?? 'Record'}';
String rowSubtitle(dynamic r) {
  final parts = [
    r['status'],
    r['role'],
    r['email'],
    r['method'],
    r['sku'],
    r['quantity'] != null ? 'Qty ${r['quantity']}' : null,
    r['amount'] != null ? money(r['amount']) : null,
    r['total'] != null ? money(r['total']) : null,
    r['createdAt'] != null ? dateText(r['createdAt']) : null
  ]
      .where((e) => e != null && '$e'.isNotEmpty)
      .map((e) => pretty('$e'))
      .toList();
  return parts.take(4).join(' · ');
}

IconData iconFor(String type) {
  final t = type.toLowerCase();
  if (t.contains('order')) return Icons.receipt_long_outlined;
  if (t.contains('payment')) return Icons.payments_outlined;
  if (t.contains('user') || t.contains('customer')) return Icons.person_outline;
  if (t.contains('product')) return Icons.devices_other;
  if (t.contains('stock') || t.contains('inventory')) {
    return Icons.inventory_2_outlined;
  }
  if (t.contains('return')) return Icons.assignment_return_outlined;
  if (t.contains('ticket')) return Icons.support_agent;
  return Icons.data_object;
}

Color statusColor(String value) {
  final v = value.toUpperCase();
  if (['PAID', 'DELIVERED', 'ACTIVE', 'APPROVED', 'RESOLVED', 'COMPLETED']
      .any(v.contains)) {
    return Colors.green;
  }
  if (['FAILED', 'CANCELLED', 'REJECTED', 'CLOSED'].any(v.contains)) {
    return Colors.red;
  }
  if (['PENDING', 'PLACED', 'OPEN', 'WAITING', 'SUBMITTED'].any(v.contains)) {
    return Colors.orange;
  }
  return lime;
}

void showDetails(BuildContext context, String title, dynamic data) =>
    showDialog(
        context: context,
        builder: (_) => AlertDialog(
                title: Text(title),
                content: SizedBox(
                    width: 650,
                    child: SingleChildScrollView(
                        child: SelectableText(
                            const JsonEncoder.withIndent('  ').convert(data)))),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Close'))
                ]));
Future<void> confirmDelete(BuildContext context, String message,
    Future<void> Function() action) async {
  final yes = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
                  title: const Text('Confirm action'),
                  content: Text(message),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(context, false),
                        child: const Text('Cancel')),
                    FilledButton(
                        onPressed: () => Navigator.pop(context, true),
                        child: const Text('Confirm'))
                  ])) ??
      false;
  if (yes && context.mounted) await safe(context, action);
}

Future<void> recordDialog(
    BuildContext context, AdminApi api, String type, String label,
    {dynamic existing}) async {
  final title = TextEditingController(text: '${existing?['title'] ?? ''}'),
      status =
          TextEditingController(text: '${existing?['status'] ?? 'ACTIVE'}'),
      details = TextEditingController(
          text: existing == null
              ? ''
              : const JsonEncoder.withIndent('  ')
                  .convert(existing['data'] ?? {}));
  await showDialog(
      context: context,
      builder: (c) => AlertDialog(
              title: Text('${existing == null ? 'Add' : 'Edit'} $label'),
              content: SizedBox(
                  width: 520,
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    TextField(
                        controller: title,
                        decoration:
                            const InputDecoration(labelText: 'Name / title')),
                    const SizedBox(height: 12),
                    TextField(
                        controller: status,
                        decoration: const InputDecoration(labelText: 'Status')),
                    const SizedBox(height: 12),
                    TextField(
                        controller: details,
                        maxLines: 6,
                        decoration: const InputDecoration(
                            labelText: 'Details (JSON)',
                            hintText: '{"contact":"..."}'))
                  ])),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(c),
                    child: const Text('Cancel')),
                FilledButton(
                    onPressed: () async {
                      try {
                        final data = details.text.trim().isEmpty
                            ? <String, dynamic>{}
                            : Map<String, dynamic>.from(
                                jsonDecode(details.text));
                        if (existing == null) {
                          await api.createRecord(type, {
                            'title': title.text.trim(),
                            'status': status.text.trim(),
                            'data': data
                          });
                        } else {
                          await api.updateRecord(type, '${existing['id']}', {
                            'title': title.text.trim(),
                            'status': status.text.trim(),
                            'data': data
                          });
                        }
                        if (c.mounted) Navigator.pop(c);
                      } catch (e) {
                        if (c.mounted) errorSnack(c, e);
                      }
                    },
                    child: const Text('Save'))
              ]));
}

Future<void> productDialog(BuildContext context, AdminApi api,
    {dynamic existing}) async {
  final name = TextEditingController(text: '${existing?['name'] ?? ''}'),
      sku = TextEditingController(text: '${existing?['sku'] ?? ''}'),
      price = TextEditingController(text: '${existing?['price'] ?? ''}'),
      desc = TextEditingController(text: '${existing?['description'] ?? ''}');
  String condition = 'BRAND_NEW',
      category =
          '${existing?['categoryId'] ?? (api.rows('categories').isEmpty ? '' : api.rows('categories').first['id'])}',
      brand =
          '${existing?['brandId'] ?? (api.rows('brands').isEmpty ? '' : api.rows('brands').first['id'])}';
  await showDialog(
      context: context,
      builder: (c) => StatefulBuilder(
          builder: (c, set) => AlertDialog(
                  title:
                      Text(existing == null ? 'Add product' : 'Edit product'),
                  content: SizedBox(
                      width: 620,
                      child: SingleChildScrollView(
                          child: Column(children: [
                        TextField(
                            controller: name,
                            decoration: const InputDecoration(
                                labelText: 'Product name')),
                        const SizedBox(height: 10),
                        TextField(
                            controller: sku,
                            decoration:
                                const InputDecoration(labelText: 'SKU')),
                        const SizedBox(height: 10),
                        TextField(
                            controller: price,
                            keyboardType: TextInputType.number,
                            decoration:
                                const InputDecoration(labelText: 'Price')),
                        const SizedBox(height: 10),
                        TextField(
                            controller: desc,
                            maxLines: 3,
                            decoration: const InputDecoration(
                                labelText: 'Description')),
                        const SizedBox(height: 10),
                        DropdownButtonFormField(
                            initialValue: category,
                            decoration:
                                const InputDecoration(labelText: 'Category'),
                            items: api
                                .rows('categories')
                                .map((x) => DropdownMenuItem(
                                    value: '${x['id']}',
                                    child: Text('${x['name']}')))
                                .toList(),
                            onChanged: (v) => category = '$v'),
                        const SizedBox(height: 10),
                        DropdownButtonFormField(
                            initialValue: brand,
                            decoration:
                                const InputDecoration(labelText: 'Brand'),
                            items: api
                                .rows('brands')
                                .map((x) => DropdownMenuItem(
                                    value: '${x['id']}',
                                    child: Text('${x['name']}')))
                                .toList(),
                            onChanged: (v) => brand = '$v'),
                        const SizedBox(height: 10),
                        DropdownButtonFormField(
                            initialValue: condition,
                            decoration:
                                const InputDecoration(labelText: 'Condition'),
                            items: [
                              'BRAND_NEW',
                              'EXCELLENT',
                              'GOOD',
                              'REFURBISHED'
                            ]
                                .map((x) => DropdownMenuItem(
                                    value: x, child: Text(pretty(x))))
                                .toList(),
                            onChanged: (v) => condition = '$v')
                      ]))),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(c),
                        child: const Text('Cancel')),
                    FilledButton(
                        onPressed: () async {
                          final body = {
                            'name': name.text.trim(),
                            'slug': name.text
                                .trim()
                                .toLowerCase()
                                .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
                                .replaceAll(RegExp(r'^-|-$'), ''),
                            'sku': sku.text.trim(),
                            'reference': existing?['reference'] ??
                                'GH-${DateTime.now().millisecondsSinceEpoch}',
                            'description': desc.text.trim(),
                            'price': double.tryParse(price.text) ?? 0,
                            'condition': condition,
                            'warrantyMonths': existing?['warrantyMonths'] ?? 12,
                            'categoryId': category,
                            'brandId': brand,
                            'featured': existing?['featured'] ?? false
                          };
                          try {
                            await api.mutate(
                                existing == null
                                    ? '/products'
                                    : '/products/${existing['id']}',
                                method: existing == null ? 'POST' : 'PATCH',
                                body: body);
                            if (c.mounted) Navigator.pop(c);
                          } catch (e) {
                            if (c.mounted) errorSnack(c, e);
                          }
                        },
                        child: const Text('Save'))
                  ])));
}

Future<void> inventoryDialog(BuildContext context, AdminApi api,
    {dynamic row}) async {
  dynamic selected = row ??
      (api.rows('inventory').isEmpty ? null : api.rows('inventory').first);
  final qty = TextEditingController(text: '1'),
      reason = TextEditingController(text: 'Manual stock adjustment');
  if (selected == null) {
    return errorSnack(context, 'No product variants exist yet');
  }
  await showDialog(
      context: context,
      builder: (c) => StatefulBuilder(
          builder: (c, set) => AlertDialog(
                  title: const Text('Adjust stock'),
                  content: SizedBox(
                      width: 520,
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        DropdownButtonFormField(
                            initialValue: '${selected['variantId']}',
                            items: api
                                .rows('inventory')
                                .map((x) => DropdownMenuItem(
                                    value: '${x['variantId']}',
                                    child: Text(
                                        '${x['variant']?['product']?['name'] ?? 'Product'} · ${x['variant']?['sku'] ?? ''}')))
                                .toList(),
                            onChanged: (v) => selected = api
                                .rows('inventory')
                                .firstWhere(
                                    (x) => '${x['variantId']}' == '$v')),
                        const SizedBox(height: 12),
                        TextField(
                            controller: qty,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                                labelText:
                                    'Quantity (+ stock in, − stock out)')),
                        const SizedBox(height: 12),
                        TextField(
                            controller: reason,
                            decoration:
                                const InputDecoration(labelText: 'Reason'))
                      ])),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(c),
                        child: const Text('Cancel')),
                    FilledButton(
                        onPressed: () async {
                          try {
                            await api.mutate(
                                '/catalog/inventory/${selected['variantId']}/adjust',
                                body: {
                                  'quantity': int.tryParse(qty.text) ?? 0,
                                  'reason': reason.text
                                });
                            if (c.mounted) Navigator.pop(c);
                          } catch (e) {
                            if (c.mounted) errorSnack(c, e);
                          }
                        },
                        child: const Text('Update stock'))
                  ])));
}

Future<void> orderStatusDialog(
    BuildContext context, AdminApi api, dynamic order) async {
  var status = '${order['status']}';
  await showDialog(
      context: context,
      builder: (c) => StatefulBuilder(
          builder: (c, set) => AlertDialog(
                  title: Text('Update ${order['orderNumber']}'),
                  content: DropdownButtonFormField(
                      initialValue: status,
                      items: [
                        'PLACED',
                        'PAYMENT_CONFIRMED',
                        'PREPARING',
                        'DISPATCHED',
                        'OUT_FOR_DELIVERY',
                        'DELIVERED',
                        'CANCELLED'
                      ]
                          .map((x) => DropdownMenuItem(
                              value: x, child: Text(pretty(x))))
                          .toList(),
                      onChanged: (v) => set(() => status = '$v')),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(c),
                        child: const Text('Cancel')),
                    FilledButton(
                        onPressed: () async {
                          try {
                            await api.mutate(
                                '/commerce/orders/${order['id']}/status',
                                method: 'PATCH',
                                body: {'status': status});
                            if (c.mounted) Navigator.pop(c);
                          } catch (e) {
                            if (c.mounted) errorSnack(c, e);
                          }
                        },
                        child: const Text('Save'))
                  ])));
}

Future<void> staffDialog(BuildContext context, AdminApi api) async {
  final email = TextEditingController(),
      password = TextEditingController(),
      first = TextEditingController(),
      last = TextEditingController();
  var role = 'STORE_MANAGER';
  await showDialog(
      context: context,
      builder: (c) => StatefulBuilder(
          builder: (c, set) => AlertDialog(
                  title: const Text('Create staff account'),
                  content: SizedBox(
                      width: 520,
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        TextField(
                            controller: first,
                            decoration:
                                const InputDecoration(labelText: 'First name')),
                        const SizedBox(height: 10),
                        TextField(
                            controller: last,
                            decoration:
                                const InputDecoration(labelText: 'Last name')),
                        const SizedBox(height: 10),
                        TextField(
                            controller: email,
                            decoration:
                                const InputDecoration(labelText: 'Email')),
                        const SizedBox(height: 10),
                        TextField(
                            controller: password,
                            obscureText: true,
                            decoration: const InputDecoration(
                                labelText:
                                    'Temporary password (12+ characters)')),
                        const SizedBox(height: 10),
                        DropdownButtonFormField(
                            initialValue: role,
                            items: [
                              'SUPER_ADMIN',
                              'STORE_MANAGER',
                              'PRODUCT',
                              'INVENTORY',
                              'ORDER',
                              'DELIVERY',
                              'SUPPORT'
                            ]
                                .map((x) => DropdownMenuItem(
                                    value: x, child: Text(pretty(x))))
                                .toList(),
                            onChanged: (v) => role = '$v')
                      ])),
                  actions: [
                    TextButton(
                        onPressed: () => Navigator.pop(c),
                        child: const Text('Cancel')),
                    FilledButton(
                        onPressed: () async {
                          try {
                            await api.mutate('/admin-console/staff', body: {
                              'email': email.text.trim(),
                              'password': password.text,
                              'firstName': first.text.trim(),
                              'lastName': last.text.trim(),
                              'role': role
                            });
                            if (c.mounted) Navigator.pop(c);
                          } catch (e) {
                            if (c.mounted) errorSnack(c, e);
                          }
                        },
                        child: const Text('Create'))
                  ])));
}

Future<void> passwordDialog(BuildContext context, AdminApi api) async {
  final current = TextEditingController(), next = TextEditingController();
  await showDialog(
      context: context,
      builder: (c) => AlertDialog(
              title: const Text('Change password'),
              content: SizedBox(
                  width: 460,
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    TextField(
                        controller: current,
                        obscureText: true,
                        decoration: const InputDecoration(
                            labelText: 'Current password')),
                    const SizedBox(height: 12),
                    TextField(
                        controller: next,
                        obscureText: true,
                        decoration:
                            const InputDecoration(labelText: 'New password'))
                  ])),
              actions: [
                TextButton(
                    onPressed: () => Navigator.pop(c),
                    child: const Text('Cancel')),
                FilledButton(
                    onPressed: () async {
                      try {
                        await api.mutate('/auth/change-password',
                            body: {
                              'currentPassword': current.text,
                              'newPassword': next.text
                            },
                            refresh: false);
                        if (c.mounted) {
                          Navigator.pop(c);
                          successSnack(context, 'Password updated');
                        }
                      } catch (e) {
                        if (c.mounted) errorSnack(c, e);
                      }
                    },
                    child: const Text('Update'))
              ]));
}

void showQuickActions(
        BuildContext context, AdminApi api, ValueChanged<int> go) =>
    showModalBottomSheet(
        context: context,
        showDragHandle: true,
        builder: (c) => SafeArea(
            child: Padding(
                padding: const EdgeInsets.all(20),
                child: Wrap(spacing: 10, runSpacing: 10, children: [
                  ActionChip(
                      avatar: const Icon(Icons.add),
                      label: const Text('Add product'),
                      onPressed: () {
                        Navigator.pop(c);
                        productDialog(context, api);
                      }),
                  ActionChip(
                      avatar: const Icon(Icons.discount),
                      label: const Text('Create coupon'),
                      onPressed: () {
                        Navigator.pop(c);
                        go(7);
                      }),
                  ActionChip(
                      avatar: const Icon(Icons.inventory),
                      label: const Text('Update stock'),
                      onPressed: () {
                        Navigator.pop(c);
                        inventoryDialog(context, api);
                      }),
                  ActionChip(
                      avatar: const Icon(Icons.search),
                      label: const Text('Find order'),
                      onPressed: () {
                        Navigator.pop(c);
                        go(3);
                      })
                ]))));
void exportDialog(BuildContext context, AdminApi api) => showDialog(
    context: context,
    builder: (c) => AlertDialog(
            title: const Text('Export data'),
            content: const Text(
                'Choose a dataset. Its current records will be copied to the clipboard as CSV.'),
            actions: [
              for (final x in ['Products', 'Customers', 'Orders', 'Inventory'])
                TextButton(
                    onPressed: () async {
                      final key = x.toLowerCase();
                      final rows = key == 'customers'
                          ? api
                              .rows('users')
                              .where((r) => r['role'] == 'CUSTOMER')
                              .toList()
                          : api.rows(key);
                      if (rows.isEmpty) {
                        errorSnack(c, 'There are no $key records to export');
                        return;
                      }
                      await Clipboard.setData(
                          ClipboardData(text: rowsToCsv(rows)));
                      if (!c.mounted) return;
                      Navigator.pop(c);
                      if (context.mounted) {
                        successSnack(context,
                            '${rows.length} $key records copied as CSV');
                      }
                    },
                    child: Text(x))
            ]));

Future<void> importDialog(BuildContext context, AdminApi api) async {
  final csv = TextEditingController();
  var type = 'products';
  await showDialog(
      context: context,
      builder: (c) => StatefulBuilder(
          builder: (c, set) => AlertDialog(
                title: const Text('Import CSV'),
                content: SizedBox(
                    width: 680,
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                      DropdownButtonFormField<String>(
                          initialValue: type,
                          decoration:
                              const InputDecoration(labelText: 'Dataset'),
                          items: ['products', 'customers', 'orders']
                              .map((x) => DropdownMenuItem(
                                  value: x, child: Text(pretty(x))))
                              .toList(),
                          onChanged: (v) => set(() => type = v!)),
                      const SizedBox(height: 12),
                      TextField(
                          controller: csv,
                          minLines: 8,
                          maxLines: 14,
                          decoration: InputDecoration(
                              labelText: 'CSV data',
                              alignLabelWithHint: true,
                              hintText: type == 'products'
                                  ? 'name,sku,price,categoryId,brandId,description,condition'
                                  : type == 'customers'
                                      ? 'email,firstName,lastName,password,isActive'
                                      : 'orderNumber,status')),
                      const SizedBox(height: 8),
                      const Text(
                          'The first row must contain column names. Valid rows are committed and invalid rows are reported.',
                          style: TextStyle(color: Colors.grey)),
                    ])),
                actions: [
                  TextButton(
                      onPressed: () => Navigator.pop(c),
                      child: const Text('Cancel')),
                  FilledButton(
                      onPressed: () async {
                        try {
                          final rows = parseCsv(csv.text);
                          if (rows.isEmpty) {
                            throw Exception(
                                'Paste a header and at least one data row');
                          }
                          final result = await api.call(
                              '/admin-console/import/$type',
                              method: 'POST',
                              body: rows);
                          await api.loadAll();
                          if (c.mounted) Navigator.pop(c);
                          if (context.mounted) {
                            successSnack(context,
                                'Imported ${result['imported']} row(s); ${result['failed']} failed');
                          }
                        } catch (e) {
                          if (c.mounted) errorSnack(c, e);
                        }
                      },
                      child: const Text('Validate & import')),
                ],
              )));
}

Future<void> bulkDialog(
    BuildContext context, AdminApi api, String resource, String action) async {
  final ids = TextEditingController();
  final value = TextEditingController();
  await showDialog(
      context: context,
      builder: (c) => AlertDialog(
            title: Text('Bulk ${pretty(action)}'),
            content: SizedBox(
                width: 600,
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  TextField(
                      controller: ids,
                      decoration: InputDecoration(
                          labelText: '${pretty(resource)} IDs',
                          hintText: 'id-1, id-2, id-3')),
                  const SizedBox(height: 12),
                  TextField(
                      controller: value,
                      decoration: InputDecoration(
                          labelText: action == 'stock'
                              ? 'Quantity adjustment'
                              : action == 'active'
                                  ? 'Active (true/false)'
                                  : action == 'category'
                                      ? 'Category ID'
                                      : 'New price')),
                ])),
            actions: [
              TextButton(
                  onPressed: () => Navigator.pop(c),
                  child: const Text('Cancel')),
              FilledButton(
                  onPressed: () async {
                    try {
                      final list = ids.text
                          .split(',')
                          .map((e) => e.trim())
                          .where((e) => e.isNotEmpty)
                          .toList();
                      dynamic parsed = value.text.trim();
                      if (action == 'price') parsed = double.parse(parsed);
                      if (action == 'stock') parsed = int.parse(parsed);
                      if (action == 'active') {
                        parsed = parsed.toLowerCase() == 'true';
                      }
                      final result = await api.call('/admin-console/bulk',
                          method: 'POST',
                          body: {
                            'resource': resource,
                            'ids': list,
                            'action': action,
                            'value': parsed
                          });
                      await api.loadAll();
                      if (c.mounted) Navigator.pop(c);
                      if (context.mounted) {
                        successSnack(
                            context, 'Updated ${result['changed']} record(s)');
                      }
                    } catch (e) {
                      if (c.mounted) errorSnack(c, e);
                    }
                  },
                  child: const Text('Apply changes')),
            ],
          ));
}

String csvCell(dynamic value) =>
    '"${'$value'.replaceAll('"', '""').replaceAll(RegExp(r'[\r\n]+'), ' ')}"';
String rowsToCsv(List<dynamic> rows) {
  final maps = rows.map((e) => Map<String, dynamic>.from(e)).toList();
  final keys = <String>{};
  for (final row in maps) {
    keys.addAll(row.keys.where((k) => row[k] is! Map && row[k] is! List));
  }
  return '${keys.map(csvCell).join(',')}\n${maps.map((row) => keys.map((k) => csvCell(row[k] ?? '')).join(',')).join('\n')}';
}

List<Map<String, dynamic>> parseCsv(String source) {
  final lines = const LineSplitter()
      .convert(source.trim())
      .where((e) => e.trim().isNotEmpty)
      .toList();
  if (lines.length < 2) return [];
  final headers = parseCsvLine(lines.first);
  return lines.skip(1).map((line) {
    final values = parseCsvLine(line);
    return <String, dynamic>{
      for (var i = 0; i < headers.length; i++)
        headers[i]: i < values.length ? values[i] : ''
    };
  }).toList();
}

List<String> parseCsvLine(String line) {
  final out = <String>[];
  final buffer = StringBuffer();
  var quoted = false;
  for (var i = 0; i < line.length; i++) {
    final ch = line[i];
    if (ch == '"') {
      if (quoted && i + 1 < line.length && line[i + 1] == '"') {
        buffer.write('"');
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch == ',' && !quoted) {
      out.add(buffer.toString().trim());
      buffer.clear();
    } else {
      buffer.write(ch);
    }
  }
  out.add(buffer.toString().trim());
  return out;
}
