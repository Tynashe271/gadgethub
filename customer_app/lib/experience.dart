import 'package:flutter/material.dart';

import 'core.dart';

enum CustomerPage {
  home,
  shop,
  finder,
  compare,
  services,
  assistant,
  feedback,
  cart,
  account
}

class CustomerExperience extends StatefulWidget {
  final ApiClient api;
  const CustomerExperience({super.key, required this.api});

  @override
  State<CustomerExperience> createState() => _CustomerExperienceState();
}

class _CustomerExperienceState extends State<CustomerExperience> {
  bool entered = false;
  bool authOpen = false;
  CustomerPage page = CustomerPage.home;

  void open(CustomerPage next) {
    if (!widget.api.signedIn &&
        !{
          CustomerPage.home,
          CustomerPage.finder,
          CustomerPage.feedback,
          CustomerPage.account
        }.contains(next)) {
      setState(() => authOpen = true);
      return;
    }
    setState(() {
      entered = true;
      authOpen = false;
      page = next;
    });
  }

  void backToLanding() => setState(() {
        entered = false;
        authOpen = false;
        page = CustomerPage.home;
      });

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: widget.api,
        builder: (context, child) {
          if (authOpen) {
            return AuthScreen(
                api: widget.api,
                onDone: () => setState(() {
                      authOpen = false;
                      entered = true;
                      page = CustomerPage.account;
                    }),
                onBack: () => setState(() => authOpen = false));
          }
          if (!entered) {
            return LandingScreen(
                onExplore: () => setState(() => entered = true),
                onSignIn: () => setState(() => authOpen = true),
                onFinder: () => open(CustomerPage.finder),
                onNavigate: open);
          }
          return AppFrame(
              api: widget.api,
              page: page,
              onNavigate: open,
              onSignIn: () => setState(() => authOpen = true),
              onSignOut: backToLanding);
        },
      );
}

/// The app's own welcome screen - shown before a visitor has entered the
/// app and again after sign-out. Deliberately not a phone-sized copy of
/// the website's hero: no desktop nav bar, no marquee, no rotated-phone
/// mockup. Just a compact, thumb-friendly welcome with a couple of quick
/// links, built for a single vertical pass rather than a wide layout.
class LandingScreen extends StatelessWidget {
  final VoidCallback onExplore, onSignIn, onFinder;
  final ValueChanged<CustomerPage> onNavigate;
  const LandingScreen(
      {super.key,
      required this.onExplore,
      required this.onSignIn,
      required this.onFinder,
      required this.onNavigate});

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: ink,
        body: SafeArea(
          child: Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 10, 12, 0),
              child: Row(children: [
                Container(
                    width: 32,
                    height: 32,
                    decoration:
                        const BoxDecoration(color: acid, shape: BoxShape.circle),
                    alignment: Alignment.center,
                    child: const Text('GH',
                        style: TextStyle(
                            color: ink, fontSize: 11, fontWeight: FontWeight.w900))),
                const SizedBox(width: 10),
                const Text('GADGETHUB',
                    style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: .5)),
                const Spacer(),
                TextButton(
                    onPressed: onSignIn,
                    child: const Text('Sign in', style: TextStyle(color: acid))),
              ]),
            ),
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(28, 16, 28, 30),
                child: Column(children: [
                  const SizedBox(height: 18),
                  Container(
                      width: 92,
                      height: 92,
                      decoration:
                          const BoxDecoration(color: acid, shape: BoxShape.circle),
                      alignment: Alignment.center,
                      child: const Text('G/H',
                          style: TextStyle(
                              color: ink, fontSize: 28, fontWeight: FontWeight.w900))),
                  const SizedBox(height: 28),
                  const Text('Welcome to\nGadgetHub.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          fontSize: 38,
                          height: .98,
                          letterSpacing: -1.4,
                          fontWeight: FontWeight.w900)),
                  const SizedBox(height: 14),
                  const Text(
                      "Zimbabwe's trusted destination for verified phones, laptops and gadgets - now in your pocket.",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                          color: Color(0xFFB5B8AF), fontSize: 15, height: 1.5)),
                  const SizedBox(height: 30),
                  const Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                    TrustBadge(icon: Icons.verified_outlined, label: 'Verified'),
                    SizedBox(width: 22),
                    TrustBadge(
                        icon: Icons.local_shipping_outlined, label: '24h dispatch'),
                    SizedBox(width: 22),
                    TrustBadge(icon: Icons.shield_outlined, label: '12mo warranty'),
                  ]),
                  const SizedBox(height: 32),
                  Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      alignment: WrapAlignment.center,
                      children: [
                        QuickLinkChip(
                            label: 'Shop',
                            onTap: () => onNavigate(CustomerPage.shop)),
                        QuickLinkChip(label: 'Phone Finder', onTap: onFinder),
                        QuickLinkChip(
                            label: 'Compare',
                            onTap: () => onNavigate(CustomerPage.compare)),
                        QuickLinkChip(
                            label: 'Services',
                            onTap: () => onNavigate(CustomerPage.services)),
                      ]),
                  const SizedBox(height: 34),
                  SizedBox(
                      width: double.infinity,
                      child: SitePrimaryButton(
                          label: 'Start exploring →', onTap: onExplore)),
                ]),
              ),
            ),
          ]),
        ),
      );
}

class TrustBadge extends StatelessWidget {
  final IconData icon;
  final String label;
  const TrustBadge({super.key, required this.icon, required this.label});
  @override
  Widget build(BuildContext context) => Column(children: [
        Icon(icon, color: acid, size: 20),
        const SizedBox(height: 6),
        Text(label,
            style: const TextStyle(
                fontSize: 10, color: Color(0xFF999999), letterSpacing: .3))
      ]);
}

class QuickLinkChip extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const QuickLinkChip({super.key, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) => InkWell(
      borderRadius: BorderRadius.circular(30),
      onTap: onTap,
      child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: const Color(0xFF343730))),
          child: Text(label, style: const TextStyle(fontSize: 13))));
}

class Brand extends StatelessWidget {
  const Brand({super.key});
  @override
  Widget build(BuildContext context) =>
      const Row(mainAxisSize: MainAxisSize.min, children: [
        Text('GADGET', style: TextStyle(fontWeight: FontWeight.w900)),
        Text('HUB', style: TextStyle(color: acid, fontWeight: FontWeight.w900))
      ]);
}

class Feature extends StatelessWidget {
  final IconData icon;
  final String title, body;
  const Feature(
      {super.key, required this.icon, required this.title, required this.body});
  @override
  Widget build(BuildContext context) => SizedBox(
      width: 230,
      child: Card(
          child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(icon, color: acid),
                    const SizedBox(height: 12),
                    Text(title,
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    Text(body, style: const TextStyle(color: Colors.white60))
                  ]))));
}

class SitePrimaryButton extends StatelessWidget {
  final String label;
  final VoidCallback onTap;
  const SitePrimaryButton(
      {super.key, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) => FilledButton(
      onPressed: onTap,
      style: FilledButton.styleFrom(
          shape: const RoundedRectangleBorder(),
          minimumSize: const Size(145, 52)),
      child: Text(label));
}


class AuthScreen extends StatefulWidget {
  final ApiClient api;
  final VoidCallback onDone, onBack;
  const AuthScreen(
      {super.key,
      required this.api,
      required this.onDone,
      required this.onBack});
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool register = false, loading = false;
  final first = TextEditingController(),
      last = TextEditingController(),
      phone = TextEditingController(),
      email = TextEditingController(),
      password = TextEditingController(),
      confirm = TextEditingController();
  @override
  void dispose() {
    for (final c in [first, last, phone, email, password, confirm]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> submit() async {
    if (email.text.trim().isEmpty || password.text.length < 8) {
      return showError(
          context,
          ApiError(
              'Enter a valid email and a password of at least 8 characters'));
    }
    if (register &&
        (first.text.trim().isEmpty ||
            last.text.trim().isEmpty ||
            password.text != confirm.text)) {
      return showError(context,
          ApiError('Complete your name and make sure passwords match'));
    }
    setState(() => loading = true);
    try {
      if (register) {
        await widget.api.register(first.text.trim(), last.text.trim(),
            email.text.trim(), password.text, phone.text);
      } else {
        await widget.api.login(email.text.trim(), password.text);
      }
      widget.onDone();
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(
            leading: IconButton(
                onPressed: widget.onBack, icon: const Icon(Icons.arrow_back)),
            title: const Brand()),
        body: Center(
            child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: ListView(padding: const EdgeInsets.all(28), children: [
                  Text(register ? 'Create your account.' : 'Welcome back.',
                      style: const TextStyle(
                          fontSize: 38, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 8),
                  Text(
                      register
                          ? 'Save products, checkout and track every order.'
                          : 'Sign in to continue your GadgetHub journey.',
                      style: const TextStyle(color: Colors.white60)),
                  const SizedBox(height: 24),
                  SegmentedButton<bool>(
                      segments: const [
                        ButtonSegment(value: false, label: Text('Sign in')),
                        ButtonSegment(
                            value: true, label: Text('Create account'))
                      ],
                      selected: {
                        register
                      },
                      onSelectionChanged: (v) =>
                          setState(() => register = v.first)),
                  const SizedBox(height: 22),
                  if (register) ...[
                    TextField(
                        controller: first,
                        decoration:
                            const InputDecoration(labelText: 'First name')),
                    const SizedBox(height: 12),
                    TextField(
                        controller: last,
                        decoration:
                            const InputDecoration(labelText: 'Last name')),
                    const SizedBox(height: 12),
                    TextField(
                        controller: phone,
                        decoration: const InputDecoration(
                            labelText: 'Phone (optional)')),
                    const SizedBox(height: 12)
                  ],
                  TextField(
                      controller: email,
                      keyboardType: TextInputType.emailAddress,
                      decoration:
                          const InputDecoration(labelText: 'Email address')),
                  const SizedBox(height: 12),
                  TextField(
                      controller: password,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Password')),
                  if (register) ...[
                    const SizedBox(height: 12),
                    TextField(
                        controller: confirm,
                        obscureText: true,
                        decoration: const InputDecoration(
                            labelText: 'Confirm password'))
                  ],
                  const SizedBox(height: 22),
                  FilledButton(
                      onPressed: loading ? null : submit,
                      child: Text(loading
                          ? 'Please wait...'
                          : register
                              ? 'Create account'
                              : 'Sign in')),
                ]))),
      );
}

class AppFrame extends StatelessWidget {
  final ApiClient api;
  final CustomerPage page;
  final ValueChanged<CustomerPage> onNavigate;
  final VoidCallback onSignIn, onSignOut;
  const AppFrame(
      {super.key,
      required this.api,
      required this.page,
      required this.onNavigate,
      required this.onSignIn,
      required this.onSignOut});
  String get title => const {
        CustomerPage.home: 'Home',
        CustomerPage.shop: 'Shop',
        CustomerPage.finder: 'Phone Finder',
        CustomerPage.compare: 'Compare',
        CustomerPage.services: 'Services',
        CustomerPage.assistant: 'AI Assistant',
        CustomerPage.feedback: 'Feedback',
        CustomerPage.cart: 'Cart',
        CustomerPage.account: 'My Account'
      }[page]!;
  Widget content() => switch (page) {
        CustomerPage.home => HomeScreen(api: api, onNavigate: onNavigate),
        CustomerPage.shop => CatalogueScreen(api: api),
        CustomerPage.finder => FinderScreen(api: api),
        CustomerPage.compare => CompareScreen(api: api),
        CustomerPage.services => ServicesScreen(api: api),
        CustomerPage.assistant => AssistantScreen(api: api),
        CustomerPage.feedback => FeedbackScreen(api: api),
        CustomerPage.cart => CheckoutCartScreen(api: api),
        CustomerPage.account => AccountHub(api: api, onSignIn: onSignIn)
      };
  @override
  Widget build(BuildContext context) =>
      LayoutBuilder(builder: (context, limits) {
        final wide = limits.maxWidth >= 800 && api.signedIn;
        final sidebar = WebsiteSidebar(
            api: api,
            page: page,
            onNavigate: onNavigate,
            onSignIn: onSignIn,
            onSignOut: onSignOut,
            closeDrawer: !wide);
        return Scaffold(
          appBar: AppBar(
            toolbarHeight: 86,
            title: const Brand(),
            bottom: const PreferredSize(
                preferredSize: Size.fromHeight(1),
                child: Divider(height: 1, color: Color(0xFF30332E))),
            actions: [
              TextButton(
                  onPressed: api.signedIn
                      ? () => onNavigate(CustomerPage.account)
                      : onSignIn,
                  child: Text(api.signedIn ? 'Dashboard' : 'Sign in')),
              const SizedBox(width: 6),
              OutlinedButton(
                  onPressed: () => onNavigate(CustomerPage.cart),
                  style: OutlinedButton.styleFrom(
                      shape: const StadiumBorder(),
                      side: const BorderSide(color: Color(0xFF3B3E38))),
                  child: Row(children: [
                    const Text('Cart'),
                    const SizedBox(width: 7),
                    CircleAvatar(
                        radius: 9,
                        backgroundColor: acid,
                        child: Text('${api.cartCount}',
                            style: const TextStyle(color: ink, fontSize: 9)))
                  ])),
              const SizedBox(width: 14)
            ],
          ),
          drawer: wide
              ? null
              : Drawer(
                  backgroundColor: const Color(0xFF0A0B09), child: sidebar),
          body: wide
              ? Row(children: [
                  SizedBox(width: 270, child: sidebar),
                  Expanded(
                      child: ColoredBox(
                          color: const Color(0xFF121410), child: content()))
                ])
              : content(),
        );
      });
}

class WebsiteSidebar extends StatelessWidget {
  final ApiClient api;
  final CustomerPage page;
  final ValueChanged<CustomerPage> onNavigate;
  final VoidCallback onSignIn, onSignOut;
  final bool closeDrawer;
  const WebsiteSidebar(
      {super.key,
      required this.api,
      required this.page,
      required this.onNavigate,
      required this.onSignIn,
      required this.onSignOut,
      required this.closeDrawer});
  @override
  Widget build(BuildContext context) => SafeArea(
      child: Container(
          decoration: const BoxDecoration(
              color: Color(0xFF0A0B09),
              border: Border(right: BorderSide(color: Color(0xFF292C27)))),
          padding: const EdgeInsets.fromLTRB(17, 25, 17, 18),
          child: Column(children: [
            Row(children: [
              Container(
                  width: 42,
                  height: 42,
                  color: acid,
                  alignment: Alignment.center,
                  child: const Text('GH',
                      style:
                          TextStyle(color: ink, fontWeight: FontWeight.w900))),
              const SizedBox(width: 12),
              const Text('MY GADGETHUB',
                  style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 1))
            ]),
            Padding(
                padding: const EdgeInsets.symmetric(vertical: 28),
                child: Row(children: [
                  CircleAvatar(
                      backgroundColor: const Color(0xFF292D25),
                      child: Text('${api.user?['firstName'] ?? 'G'}'[0],
                          style: const TextStyle(color: acid))),
                  const SizedBox(width: 12),
                  Expanded(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                        Text('${api.user?['firstName'] ?? 'Guest'}',
                            style:
                                const TextStyle(fontWeight: FontWeight.bold)),
                        Text('${api.user?['email'] ?? 'Sign in'}',
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                                color: Color(0xFF666666), fontSize: 11))
                      ]))
                ])),
            const Divider(color: Color(0xFF282A26)),
            Expanded(
                child: ListView(children: [
              for (final item in CustomerPage.values)
                Padding(
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: ListTile(
                        selected: item == page,
                        selectedColor: acid,
                        selectedTileColor: const Color(0xFF1D2119),
                        leading: Icon(_icons[item], size: 19),
                        title: Text(_labels[item]!,
                            style: const TextStyle(fontSize: 12)),
                        onTap: () {
                          if (closeDrawer) Navigator.pop(context);
                          onNavigate(item);
                        }))
            ])),
            const Divider(color: Color(0xFF292C27)),
            ListTile(
                leading: Icon(api.signedIn ? Icons.logout : Icons.login),
                title: Text(api.signedIn ? 'Sign out' : 'Sign in'),
                onTap: () async {
                  if (closeDrawer) Navigator.pop(context);
                  if (api.signedIn) {
                    await api.logout();
                    onSignOut();
                  } else {
                    onSignIn();
                  }
                }),
          ])));
}

const _labels = {
  CustomerPage.home: 'Home',
  CustomerPage.shop: 'Shop',
  CustomerPage.finder: 'Phone Finder',
  CustomerPage.compare: 'Compare',
  CustomerPage.services: 'Services & Support',
  CustomerPage.assistant: 'AI Assistant',
  CustomerPage.feedback: 'Rate us / Contact',
  CustomerPage.cart: 'Cart & Checkout',
  CustomerPage.account: 'Account Dashboard'
};
const _icons = {
  CustomerPage.home: Icons.home_outlined,
  CustomerPage.shop: Icons.storefront_outlined,
  CustomerPage.finder: Icons.manage_search,
  CustomerPage.compare: Icons.compare_arrows,
  CustomerPage.services: Icons.build_outlined,
  CustomerPage.assistant: Icons.auto_awesome,
  CustomerPage.feedback: Icons.star_outline,
  CustomerPage.cart: Icons.shopping_bag_outlined,
  CustomerPage.account: Icons.person_outline
};

class HomeScreen extends StatelessWidget {
  final ApiClient api;
  final ValueChanged<CustomerPage> onNavigate;
  const HomeScreen({super.key, required this.api, required this.onNavigate});
  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.all(24), children: [
        Text(
            api.signedIn
                ? 'Welcome, ${api.user?['firstName'] ?? 'customer'}.'
                : 'Discover GadgetHub.',
            style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w900)),
        const SizedBox(height: 8),
        const Text(
            'Everything from the web experience, designed for your phone.',
            style: TextStyle(color: Colors.white60)),
        const SizedBox(height: 24),
        Wrap(spacing: 12, runSpacing: 12, children: [
          ActionCard(
              icon: Icons.storefront,
              title: 'Shop',
              body: 'Browse the live catalogue',
              onTap: () => onNavigate(CustomerPage.shop)),
          ActionCard(
              icon: Icons.manage_search,
              title: 'Phone Finder',
              body: 'Match a phone to your needs',
              onTap: () => onNavigate(CustomerPage.finder)),
          ActionCard(
              icon: Icons.compare_arrows,
              title: 'Compare',
              body: 'Compare up to four devices',
              onTap: () => onNavigate(CustomerPage.compare)),
          ActionCard(
              icon: Icons.build,
              title: 'Services',
              body: 'Trade-ins, repairs and support',
              onTap: () => onNavigate(CustomerPage.services)),
          ActionCard(
              icon: Icons.auto_awesome,
              title: 'AI Assistant',
              body: 'Get personal buying advice',
              onTap: () => onNavigate(CustomerPage.assistant)),
          ActionCard(
              icon: Icons.star,
              title: 'Feedback',
              body: 'Contact and rate GadgetHub',
              onTap: () => onNavigate(CustomerPage.feedback))
        ]),
      ]);
}

class ActionCard extends StatelessWidget {
  final IconData icon;
  final String title, body;
  final VoidCallback onTap;
  const ActionCard(
      {super.key,
      required this.icon,
      required this.title,
      required this.body,
      required this.onTap});
  @override
  Widget build(BuildContext context) => SizedBox(
      width: 260,
      child: Card(
          child: InkWell(
              onTap: onTap,
              child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(icon, color: acid),
                        const SizedBox(height: 12),
                        Text(title,
                            style: const TextStyle(
                                fontSize: 18, fontWeight: FontWeight.bold)),
                        Text(body,
                            style: const TextStyle(color: Colors.white60))
                      ])))));
}

class CatalogueScreen extends StatefulWidget {
  final ApiClient api;
  const CatalogueScreen({super.key, required this.api});
  @override
  State<CatalogueScreen> createState() => _CatalogueScreenState();
}

class _CatalogueScreenState extends State<CatalogueScreen> {
  String query = '';
  String category = 'All';
  @override
  Widget build(BuildContext context) {
    final categories = [
      'All',
      ...{for (final product in widget.api.products) product.category}
    ];
    final products = widget.api.products
        .where((p) =>
            (category == 'All' || p.category == category) &&
            '${p.name} ${p.brand}'.toLowerCase().contains(query.toLowerCase()))
        .toList();
    return Column(children: [
      Padding(
          padding: const EdgeInsets.fromLTRB(24, 55, 24, 28),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('THE COLLECTION',
                style: TextStyle(
                    color: acid,
                    fontSize: 10,
                    letterSpacing: 1.6,
                    fontWeight: FontWeight.w800)),
            const SizedBox(height: 14),
            const Text('Find your next essential.',
                style: TextStyle(
                    fontSize: 42,
                    height: .95,
                    letterSpacing: -2,
                    fontWeight: FontWeight.w900)),
            const SizedBox(height: 18),
            const Text(
                "Search, filter and compare verified devices. Live stock is loaded from GadgetHub's catalogue.",
                style: TextStyle(color: Color(0xFF92968D), height: 1.5)),
            const SizedBox(height: 30),
            Wrap(
                spacing: 8,
                runSpacing: 8,
                children: categories
                    .map((item) => ChoiceChip(
                        label: Text(item),
                        selected: category == item,
                        onSelected: (_) => setState(() => category = item),
                        selectedColor: acid,
                        labelStyle: TextStyle(
                            color: category == item
                                ? ink
                                : const Color(0xFFAAAAAA)),
                        shape: const StadiumBorder(
                            side: BorderSide(color: Color(0xFF343731)))))
                    .toList()),
            const SizedBox(height: 18),
            TextField(
                decoration: const InputDecoration(
                    prefixIcon: Icon(Icons.search),
                    hintText: 'Search products',
                    filled: false,
                    enabledBorder: UnderlineInputBorder(
                        borderSide: BorderSide(color: Color(0xFF555555)))),
                onChanged: (v) => setState(() => query = v),
                onSubmitted: widget.api.loadProducts),
          ])),
      Expanded(
          child: products.isEmpty
              ? const Center(child: Text('No products found'))
              : GridView.builder(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                      maxCrossAxisExtent: 310,
                      mainAxisExtent: 405,
                      crossAxisSpacing: 16,
                      mainAxisSpacing: 16),
                  itemCount: products.length,
                  itemBuilder: (_, i) =>
                      MobileProductCard(product: products[i], api: widget.api)))
    ]);
  }
}

class MobileProductCard extends StatelessWidget {
  final Product product;
  final ApiClient api;
  const MobileProductCard(
      {super.key, required this.product, required this.api});
  @override
  Widget build(BuildContext context) {
    final saved = api.wishlist.any((x) => x['productId'] == product.id);
    final index = api.products.indexWhere((item) => item.id == product.id);
    final artColors = [
      const Color(0xFF1A1C18),
      const Color(0xFFE2E0D7),
      const Color(0xFF292D25),
      acid
    ];
    final artColor = artColors[(index < 0 ? 0 : index) % artColors.length];
    final darkArt = artColor == acid || artColor == const Color(0xFFE2E0D7);
    return Container(
        decoration: const BoxDecoration(color: Colors.transparent),
        clipBehavior: Clip.antiAlias,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
              child: Stack(children: [
            Container(
                color: artColor,
                width: double.infinity,
                child: product.image.isEmpty
                    ? Icon(Icons.devices,
                        size: 105,
                        color: darkArt ? ink : const Color(0xFF41463A))
                    : Image.network(product.image,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => Icon(
                            Icons.devices,
                            size: 105,
                            color: darkArt ? ink : const Color(0xFF41463A)))),
            Positioned(
                top: 12,
                left: 12,
                child: Container(
                    color: Colors.white,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    child: const Text('AVAILABLE',
                        style: TextStyle(
                            color: ink,
                            fontSize: 7,
                            letterSpacing: 1.2,
                            fontWeight: FontWeight.bold)))),
            Positioned(
                right: 10,
                bottom: 10,
                child: Row(children: [
                  CircleAction(
                      icon: saved ? Icons.favorite : Icons.favorite_border,
                      onTap: () async {
                        try {
                          await api.toggleWishlist(product);
                        } catch (error) {
                          if (context.mounted) showError(context, error);
                        }
                      }),
                  const SizedBox(width: 6),
                  CircleAction(
                      icon: Icons.compare_arrows,
                      onTap: () => api.toggleCompare(product)),
                  const SizedBox(width: 6),
                  CircleAction(
                      icon: Icons.add,
                      onTap: () async {
                        try {
                          await api.addToCart(product);
                        } catch (error) {
                          if (context.mounted) showError(context, error);
                        }
                      })
                ]))
          ])),
          Padding(
              padding: const EdgeInsets.fromLTRB(4, 18, 4, 8),
              child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(product.brand.toUpperCase(),
                        style: const TextStyle(
                            color: Color(0xFF777777),
                            fontSize: 8,
                            letterSpacing: 1.5)),
                    const SizedBox(height: 7),
                    Text(product.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 10),
                    Text('\$${product.price.toStringAsFixed(2)}',
                        style: const TextStyle(fontWeight: FontWeight.bold)),
                  ]))
        ]));
  }
}

class CircleAction extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const CircleAction({super.key, required this.icon, required this.onTap});
  @override
  Widget build(BuildContext context) => Material(
      color: Colors.white,
      shape: const CircleBorder(),
      child: InkWell(
          customBorder: const CircleBorder(),
          onTap: onTap,
          child: SizedBox(
              width: 36, height: 36, child: Icon(icon, color: ink, size: 18))));
}

class FinderScreen extends StatefulWidget {
  final ApiClient api;
  const FinderScreen({super.key, required this.api});
  @override
  State<FinderScreen> createState() => _FinderScreenState();
}

class _FinderScreenState extends State<FinderScreen> {
  double budget = 1000;
  String need = 'All';
  @override
  Widget build(BuildContext context) {
    final matches = widget.api.products
        .where((p) =>
            p.price <= budget &&
            (need == 'All' ||
                p.category.toLowerCase().contains(need.toLowerCase())))
        .toList();
    return ListView(padding: const EdgeInsets.all(24), children: [
      const Text('Find your ideal device.',
          style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900)),
      Text('Budget up to \$${budget.round()}'),
      Slider(
          value: budget,
          min: 100,
          max: 3000,
          divisions: 29,
          onChanged: (v) => setState(() => budget = v)),
      DropdownButtonFormField(
          initialValue: need,
          decoration:
              const InputDecoration(labelText: 'What are you looking for?'),
          items: ['All', 'Phones', 'Laptops', 'Audio']
              .map((v) => DropdownMenuItem(value: v, child: Text(v)))
              .toList(),
          onChanged: (v) => setState(() => need = v!)),
      const SizedBox(height: 20),
      Text('${matches.length} matches',
          style: const TextStyle(fontWeight: FontWeight.bold)),
      ...matches.map((p) => ListTile(
          title: Text(p.name),
          subtitle: Text(p.brand),
          trailing: Text('\$${p.price.toStringAsFixed(0)}')))
    ]);
  }
}

class CompareScreen extends StatelessWidget {
  final ApiClient api;
  const CompareScreen({super.key, required this.api});
  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.all(24), children: [
        const Text('Compare without the confusion.',
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900)),
        const SizedBox(height: 16),
        if (api.compare.isEmpty)
          const Text('Add products using the compare button in Shop.')
        else
          ...api.compare.map((p) => Card(
              child: ListTile(
                  title: Text(p.name),
                  subtitle: Text('${p.brand} • ${p.stock} in stock'),
                  trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('\$${p.price.toStringAsFixed(2)}'),
                        InkWell(
                            onTap: () => api.toggleCompare(p),
                            child: const Text('Remove',
                                style: TextStyle(color: acid)))
                      ]))))
      ]);
}

class ServicesScreen extends StatefulWidget {
  final ApiClient api;
  const ServicesScreen({super.key, required this.api});
  @override
  State<ServicesScreen> createState() => _ServicesScreenState();
}

class _ServicesScreenState extends State<ServicesScreen> {
  final model = TextEditingController(),
      subject = TextEditingController(),
      message = TextEditingController();
  String condition = 'GOOD';
  String? result;
  @override
  void dispose() {
    model.dispose();
    subject.dispose();
    message.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.all(24), children: [
        const Text('Services & support.',
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900)),
        const SizedBox(height: 8),
        const Text(
            'Trade-ins, repairs, warranties, returns and support tickets.',
            style: TextStyle(color: Colors.white60)),
        const SizedBox(height: 22),
        TextField(
            controller: model,
            decoration:
                const InputDecoration(labelText: 'Device model for trade-in')),
        const SizedBox(height: 12),
        DropdownButtonFormField(
            initialValue: condition,
            decoration: const InputDecoration(labelText: 'Condition'),
            items: ['BRAND_NEW', 'EXCELLENT', 'GOOD', 'REFURBISHED']
                .map((v) => DropdownMenuItem(
                    value: v, child: Text(v.replaceAll('_', ' '))))
                .toList(),
            onChanged: (v) => setState(() => condition = v!)),
        const SizedBox(height: 12),
        FilledButton(
            onPressed: () async {
              try {
                final estimate =
                    await widget.api.tradeInEstimate(model.text, condition, 12);
                setState(() => result =
                    'Estimated value: \$${estimate['estimatedValue']}');
              } catch (e) {
                if (context.mounted) showError(context, e);
              }
            },
            child: const Text('Estimate trade-in')),
        if (result != null)
          Padding(
              padding: const EdgeInsets.all(12),
              child: Text(result!,
                  style: const TextStyle(
                      color: acid, fontWeight: FontWeight.bold))),
        const Divider(height: 40),
        TextField(
            controller: subject,
            decoration: const InputDecoration(labelText: 'Support subject')),
        const SizedBox(height: 12),
        TextField(
            controller: message,
            maxLines: 4,
            decoration: const InputDecoration(labelText: 'How can we help?')),
        const SizedBox(height: 12),
        FilledButton(
            onPressed: () async {
              try {
                await widget.api.submitSupport(subject.text, message.text);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text('Support ticket submitted')));
                }
              } catch (e) {
                if (context.mounted) showError(context, e);
              }
            },
            child: const Text('Submit support ticket'))
      ]);
}

class AssistantScreen extends StatefulWidget {
  final ApiClient api;
  const AssistantScreen({super.key, required this.api});
  @override
  State<AssistantScreen> createState() => _AssistantScreenState();
}

class _AssistantScreenState extends State<AssistantScreen> {
  final input = TextEditingController();
  final messages = <String>[];
  String? conversation;
  bool loading = false;
  @override
  void dispose() {
    input.dispose();
    super.dispose();
  }

  Future<void> send() async {
    if (input.text.trim().isEmpty) return;
    final question = input.text.trim();
    setState(() {
      messages.add('You: $question');
      loading = true;
      input.clear();
    });
    try {
      final data = await widget.api.askAssistant(question, conversation);
      conversation = '${data['conversationId']}';
      setState(() => messages.add('GadgetHub: ${data['reply']}'));
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) => Column(children: [
        const Padding(
            padding: EdgeInsets.all(20),
            child: Text('GadgetHub AI Assistant',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900))),
        Expanded(
            child: ListView(padding: const EdgeInsets.all(20), children: [
          if (messages.isEmpty)
            const Text(
                'Ask for product recommendations, comparisons or buying advice.'),
          ...messages.map((m) => Card(
              child:
                  Padding(padding: const EdgeInsets.all(14), child: Text(m))))
        ])),
        Padding(
            padding: const EdgeInsets.all(16),
            child: Row(children: [
              Expanded(
                  child: TextField(
                      controller: input,
                      onSubmitted: (_) => send(),
                      decoration:
                          const InputDecoration(hintText: 'Ask GadgetHub...'))),
              IconButton(
                  onPressed: loading ? null : send,
                  icon: const Icon(Icons.send, color: acid))
            ]))
      ]);
}

class FeedbackScreen extends StatefulWidget {
  final ApiClient api;
  const FeedbackScreen({super.key, required this.api});
  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  late final name = TextEditingController(
          text:
              '${widget.api.user?['firstName'] ?? ''} ${widget.api.user?['lastName'] ?? ''}'
                  .trim()),
      email = TextEditingController(text: '${widget.api.user?['email'] ?? ''}'),
      subject = TextEditingController(),
      message = TextEditingController();
  @override
  void dispose() {
    for (final c in [name, email, subject, message]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      ListView(padding: const EdgeInsets.all(24), children: [
        const Text('Rate us. Contact us.',
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900)),
        const SizedBox(height: 20),
        TextField(
            controller: name,
            decoration: const InputDecoration(labelText: 'Name')),
        const SizedBox(height: 12),
        TextField(
            controller: email,
            decoration: const InputDecoration(labelText: 'Email')),
        const SizedBox(height: 12),
        TextField(
            controller: subject,
            decoration: const InputDecoration(labelText: 'Subject')),
        const SizedBox(height: 12),
        TextField(
            controller: message,
            maxLines: 5,
            decoration:
                const InputDecoration(labelText: 'Message or feedback')),
        const SizedBox(height: 16),
        FilledButton(
            onPressed: () async {
              try {
                await widget.api.sendFeedback(
                    name: name.text,
                    email: email.text,
                    subject: subject.text,
                    message: message.text);
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                      content: Text('Thank you — message sent')));
                }
              } catch (e) {
                if (context.mounted) showError(context, e);
              }
            },
            child: const Text('Send feedback'))
      ]);
}

class CheckoutCartScreen extends StatelessWidget {
  final ApiClient api;
  const CheckoutCartScreen({super.key, required this.api});
  @override
  Widget build(BuildContext context) {
    final items = (api.cart?['items'] as List?) ?? const [];
    return ListView(padding: const EdgeInsets.all(20), children: [
      const Text('Cart & checkout.',
          style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900)),
      const SizedBox(height: 16),
      if (items.isEmpty)
        const Padding(
            padding: EdgeInsets.all(40),
            child: Center(child: Text('Your cart is empty')))
      else
        ...items.map((item) {
          final p = item['product'] ?? {};
          return ListTile(
              title: Text('${p['name'] ?? 'Product'}'),
              subtitle: Text('Quantity ${item['quantity'] ?? 1}'),
              trailing: IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () async => api.removeCartItem('${item['id']}')));
        }),
      if (items.isNotEmpty) ...[
        const Divider(),
        FilledButton.icon(
            onPressed: () => showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                builder: (_) => CheckoutSheet(api: api)),
            icon: const Icon(Icons.lock_outline),
            label: const Text('Continue to checkout'))
      ]
    ]);
  }
}

class CheckoutSheet extends StatefulWidget {
  final ApiClient api;
  const CheckoutSheet({super.key, required this.api});
  @override
  State<CheckoutSheet> createState() => _CheckoutSheetState();
}

class _CheckoutSheetState extends State<CheckoutSheet> {
  String? address;
  final coupon = TextEditingController(),
      recipient = TextEditingController(),
      phone = TextEditingController(),
      line = TextEditingController(),
      city = TextEditingController();
  @override
  void initState() {
    super.initState();
    if (widget.api.addresses.isNotEmpty) {
      address = '${widget.api.addresses.first['id']}';
    }
  }

  @override
  void dispose() {
    for (final c in [coupon, recipient, phone, line, city]) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => SafeArea(
      child: Padding(
          padding: EdgeInsets.only(
              left: 24,
              right: 24,
              top: 24,
              bottom: MediaQuery.viewInsetsOf(context).bottom + 24),
          child: ListView(shrinkWrap: true, children: [
            const Text('Secure checkout',
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900)),
            if (widget.api.addresses.isNotEmpty)
              DropdownButtonFormField(
                  initialValue: address,
                  decoration:
                      const InputDecoration(labelText: 'Delivery address'),
                  items: widget.api.addresses
                      .map((a) => DropdownMenuItem(
                          value: '${a['id']}',
                          child: Text('${a['line1']}, ${a['city']}')))
                      .toList(),
                  onChanged: (v) => setState(() => address = v))
            else ...[
              const Text('Add your first delivery address'),
              TextField(
                  controller: recipient,
                  decoration: const InputDecoration(labelText: 'Recipient')),
              const SizedBox(height: 8),
              TextField(
                  controller: phone,
                  decoration: const InputDecoration(labelText: 'Phone')),
              const SizedBox(height: 8),
              TextField(
                  controller: line,
                  decoration: const InputDecoration(labelText: 'Address line')),
              const SizedBox(height: 8),
              TextField(
                  controller: city,
                  decoration: const InputDecoration(labelText: 'City'))
            ],
            const SizedBox(height: 12),
            TextField(
                controller: coupon,
                decoration:
                    const InputDecoration(labelText: 'Coupon code (optional)')),
            const SizedBox(height: 16),
            FilledButton(
                onPressed: () async {
                  try {
                    if (address == null) {
                      await widget.api.addAddress({
                        'recipient': recipient.text,
                        'phone': phone.text,
                        'line1': line.text,
                        'city': city.text,
                        'country': 'Zimbabwe',
                        'isDefault': true
                      });
                      address = '${widget.api.addresses.first['id']}';
                    }
                    await widget.api.createOrder(
                        addressId: address!, couponCode: coupon.text);
                    if (context.mounted) {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                          content: Text('Order placed successfully')));
                    }
                  } catch (e) {
                    if (context.mounted) showError(context, e);
                  }
                },
                child: const Text('Place order'))
          ])));
}

class AccountHub extends StatelessWidget {
  final ApiClient api;
  final VoidCallback onSignIn;
  const AccountHub({super.key, required this.api, required this.onSignIn});

  @override
  Widget build(BuildContext context) {
    if (!api.signedIn) {
      return Center(
          child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.account_circle_outlined,
                        size: 70, color: acid),
                    const Text('One account. Every service.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            fontSize: 30, fontWeight: FontWeight.w900)),
                    const SizedBox(height: 16),
                    FilledButton(
                        onPressed: onSignIn,
                        child: const Text('Sign in or create account'))
                  ]))));
    }
    final orderTiles = api.orders.isEmpty
        ? <Widget>[const ListTile(title: Text('No orders yet'))]
        : api.orders
            .map<Widget>((o) => ListTile(
                leading: const Icon(Icons.inventory_2_outlined),
                title: Text('${o['orderNumber']}'),
                subtitle: Text('${o['status']}'),
                trailing: Text('\$${o['total']}')))
            .toList();
    final addressTiles = api.addresses.isEmpty
        ? <Widget>[const ListTile(title: Text('No saved addresses'))]
        : api.addresses
            .map<Widget>((a) => ListTile(
                leading: const Icon(Icons.location_on_outlined),
                title: Text('${a['label'] ?? 'Delivery address'}'),
                subtitle: Text('${a['line1']}, ${a['city']}')))
            .toList();
    final wishTiles = api.wishlist.isEmpty
        ? <Widget>[const ListTile(title: Text('Your wishlist is empty'))]
        : api.wishlist.map<Widget>((w) {
            final p = w['product'] ?? {};
            return ListTile(
                leading: const Icon(Icons.favorite, color: acid),
                title: Text('${p['name'] ?? 'Product'}'));
          }).toList();
    return DefaultTabController(
        length: 5,
        child: Column(children: [
          Padding(
              padding: const EdgeInsets.all(20),
              child: Row(children: [
                CircleAvatar(
                    backgroundColor: acid,
                    child: Text('${api.user?['firstName'] ?? 'G'}'[0],
                        style: const TextStyle(color: ink))),
                const SizedBox(width: 12),
                Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                      Text('${api.user?['firstName']} ${api.user?['lastName']}',
                          style: const TextStyle(fontWeight: FontWeight.bold)),
                      Text('${api.user?['email']}',
                          style: const TextStyle(color: Colors.white60))
                    ]))
              ])),
          const TabBar(isScrollable: true, tabs: [
            Tab(text: 'Orders'),
            Tab(text: 'Addresses'),
            Tab(text: 'Wishlist'),
            Tab(text: 'Rewards'),
            Tab(text: 'Security')
          ]),
          Expanded(
              child: TabBarView(children: [
            RefreshIndicator(
                onRefresh: api.loadOrders,
                child: ListView(children: orderTiles)),
            ListView(children: addressTiles),
            ListView(children: wishTiles),
            const Center(
                child: Text(
                    'Loyalty rewards and coupon redemptions appear here.')),
            const Center(child: Text('Password and account security settings.'))
          ])),
        ]));
  }
}
