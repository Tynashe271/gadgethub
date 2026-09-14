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
                onFinder: () => open(CustomerPage.finder));
          }
          return AppFrame(
              api: widget.api,
              page: page,
              onNavigate: open,
              onSignIn: () => setState(() => authOpen = true));
        },
      );
}

class LandingScreen extends StatelessWidget {
  final VoidCallback onExplore, onSignIn, onFinder;
  const LandingScreen(
      {super.key,
      required this.onExplore,
      required this.onSignIn,
      required this.onFinder});

  @override
  Widget build(BuildContext context) => Scaffold(
        body: ListView(children: [
          const Announcement(),
          SiteHeader(onHome: () {}, onSignIn: onSignIn, onCart: onExplore),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Center(
                child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1180),
              child: LayoutBuilder(builder: (context, limits) {
                final compact = limits.maxWidth < 800;
                final copy = Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Row(mainAxisSize: MainAxisSize.min, children: [
                        DecoratedBox(
                            decoration: BoxDecoration(
                                color: acid, shape: BoxShape.circle),
                            child: SizedBox(width: 7, height: 7)),
                        SizedBox(width: 9),
                        Text("ZIMBABWE'S TRUSTED TECH DESTINATION",
                            style: TextStyle(
                                color: acid,
                                fontSize: 10,
                                letterSpacing: 1.6,
                                fontWeight: FontWeight.w800))
                      ]),
                      const SizedBox(height: 26),
                      Text('TECH THAT\nMOVES WITH YOU.',
                          style: TextStyle(
                              fontSize: compact ? 54 : 86,
                              height: .84,
                              letterSpacing: -4,
                              fontWeight: FontWeight.w900)),
                      const SizedBox(height: 30),
                      const Text(
                          'iPhones, gadgets and electronics—curated with honest advice, flexible ways to pay and support that stays with you.',
                          style: TextStyle(
                              color: Color(0xFFB5B8AF),
                              fontSize: 18,
                              height: 1.6)),
                      const SizedBox(height: 32),
                      Wrap(
                          spacing: 28,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            SitePrimaryButton(
                                label: 'Shop now  ↗', onTap: onExplore),
                            TextButton(
                                onPressed: onFinder,
                                child: const Text('Find my phone →',
                                    style: TextStyle(
                                        color: Colors.white,
                                        decoration: TextDecoration.underline)))
                          ]),
                      const SizedBox(height: 48),
                      const Row(children: [
                        Proof(value: '24h', label: 'DISPATCH'),
                        SizedBox(width: 38),
                        Proof(value: '12 mo', label: 'WARRANTY'),
                        SizedBox(width: 38),
                        Proof(value: '4.9/5', label: 'CUSTOMER RATING')
                      ]),
                    ]);
                return compact
                    ? Column(children: [
                        const SizedBox(height: 64),
                        copy,
                        const PhoneHero()
                      ])
                    : SizedBox(
                        height: 660,
                        child: Row(children: [
                          Expanded(child: copy),
                          const Expanded(child: PhoneHero())
                        ]));
              }),
            )),
          ),
          const LimeMarquee(),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 70, 24, 100),
            child: Center(
                child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 1180),
                    child: LayoutBuilder(builder: (context, limits) {
                      final compact = limits.maxWidth < 700;
                      final cards = [
                        WebsiteOption(
                            number: '01',
                            caption: 'Not sure what to buy?',
                            action: 'Use Phone Finder →',
                            onTap: onFinder),
                        WebsiteOption(
                            number: '02',
                            caption: 'Choosing between devices?',
                            action: 'Compare specifications →',
                            onTap: onExplore),
                        WebsiteOption(
                            number: '03',
                            caption: 'Already own your tech?',
                            action: 'Trade in or get support →',
                            onTap: onSignIn)
                      ];
                      return compact
                          ? Column(children: cards)
                          : Row(
                              children: cards
                                  .map((card) => Expanded(child: card))
                                  .toList());
                    }))),
          ),
        ]),
      );
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

class Announcement extends StatelessWidget {
  const Announcement({super.key});
  @override
  Widget build(BuildContext context) => Container(
      height: 32,
      color: acid,
      alignment: Alignment.center,
      child: const Text(
          'FREE DELIVERY IN HARARE ON ORDERS OVER \$100  •  SHOP NOW',
          style: TextStyle(
              color: ink,
              fontSize: 9,
              fontWeight: FontWeight.w900,
              letterSpacing: 1.2)));
}

class SiteHeader extends StatelessWidget {
  final VoidCallback onHome, onSignIn, onCart;
  const SiteHeader(
      {super.key,
      required this.onHome,
      required this.onSignIn,
      required this.onCart});
  @override
  Widget build(BuildContext context) => Container(
      height: 86,
      decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: Color(0xFF30332E)))),
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Center(
          child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 1180),
              child: Row(children: [
                InkWell(onTap: onHome, child: const Brand()),
                const Spacer(),
                if (MediaQuery.sizeOf(context).width > 850) ...[
                  for (final label in [
                    'Shop',
                    'Phone Finder',
                    'AI Assistant',
                    'Rate Us',
                    'Compare',
                    'Services'
                  ])
                    Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text(label,
                            style: const TextStyle(
                                fontSize: 12, color: Color(0xFFD8DBD3))))
                ],
                const Spacer(),
                OutlinedButton(
                    onPressed: onSignIn,
                    style: OutlinedButton.styleFrom(
                        shape: const StadiumBorder(),
                        side: const BorderSide(color: Color(0xFF3B3E38))),
                    child: const Text('Sign in')),
                const SizedBox(width: 8),
                OutlinedButton(
                    onPressed: onCart,
                    style: OutlinedButton.styleFrom(
                        shape: const StadiumBorder(),
                        side: const BorderSide(color: Color(0xFF3B3E38))),
                    child: const Text('Cart'))
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

class Proof extends StatelessWidget {
  final String value, label;
  const Proof({super.key, required this.value, required this.label});
  @override
  Widget build(BuildContext context) =>
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(value,
            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
        Text(label,
            style: const TextStyle(
                color: Color(0xFF777777), fontSize: 8, letterSpacing: 1))
      ]);
}

class PhoneHero extends StatelessWidget {
  const PhoneHero({super.key});
  @override
  Widget build(BuildContext context) => SizedBox(
      height: 560,
      child: Stack(alignment: Alignment.center, children: [
        Container(
            width: 500,
            height: 500,
            decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF333333)))),
        Container(
            width: 380,
            height: 380,
            decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFF505744)))),
        Transform.rotate(
            angle: .17,
            child: Container(
                width: 230,
                height: 465,
                padding: const EdgeInsets.all(13),
                decoration: BoxDecoration(
                    color: const Color(0xFF161815),
                    borderRadius: BorderRadius.circular(38),
                    border:
                        Border.all(color: const Color(0xFFAEB4A9), width: 7),
                    boxShadow: const [
                      BoxShadow(
                          color: Colors.black,
                          blurRadius: 70,
                          offset: Offset(0, 35)),
                      BoxShadow(color: Color(0x22C8FF38), blurRadius: 70)
                    ]),
                child: Container(
                    decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(25),
                        gradient: const RadialGradient(
                            center: Alignment(.3, -.3),
                            colors: [
                              Color(0xFFD7FF6A),
                              Color(0xFF323B20),
                              Color(0xFF161914)
                            ],
                            stops: [
                              0,
                              .25,
                              1
                            ])),
                    child: const Stack(children: [
                      Positioned(
                          top: 20,
                          left: 20,
                          child: Text('09:41', style: TextStyle(fontSize: 10))),
                      Center(
                          child: Text('G/H',
                              style: TextStyle(
                                  color: acid,
                                  fontSize: 54,
                                  fontWeight: FontWeight.w900))),
                      Positioned(
                          left: 20,
                          bottom: 28,
                          child: Text('THE NEXT\nGENERATION',
                              style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w800,
                                  letterSpacing: 2)))
                    ])))),
        const Positioned(
            left: 0, top: 170, child: HeroTag(text: 'VERIFIED DEVICES')),
        const Positioned(
            right: 0, bottom: 130, child: HeroTag(text: 'TRADE IN READY'))
      ]));
}

class HeroTag extends StatelessWidget {
  final String text;
  const HeroTag({super.key, required this.text});
  @override
  Widget build(BuildContext context) => Container(
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
          color: const Color(0xFF1D201B),
          border: Border.all(color: const Color(0xFF454B3D))),
      child:
          Text(text, style: const TextStyle(fontSize: 8, letterSpacing: 1.2)));
}

class LimeMarquee extends StatelessWidget {
  const LimeMarquee({super.key});
  @override
  Widget build(BuildContext context) => Transform.rotate(
      angle: -.02,
      child: Container(
          color: acid,
          padding: const EdgeInsets.symmetric(vertical: 13),
          child: const Text(
              'NEW RELEASES ✦ ECOCASH & ONEMONEY ✦ TRADE IN & UPGRADE ✦ EXPERT SUPPORT ✦ WARRANTY INCLUDED ✦',
              maxLines: 1,
              overflow: TextOverflow.clip,
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: ink,
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.3))));
}

class WebsiteOption extends StatelessWidget {
  final String number, caption, action;
  final VoidCallback onTap;
  const WebsiteOption(
      {super.key,
      required this.number,
      required this.caption,
      required this.action,
      required this.onTap});
  @override
  Widget build(BuildContext context) => InkWell(
      onTap: onTap,
      child: Container(
          height: 155,
          padding: const EdgeInsets.all(30),
          decoration: BoxDecoration(
              color: const Color(0xFF161815),
              border: Border.all(color: const Color(0xFF30332E))),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(number, style: const TextStyle(color: acid, fontSize: 9)),
            const Spacer(),
            Text(caption,
                style: const TextStyle(color: Color(0xFF888888), fontSize: 12)),
            const SizedBox(height: 12),
            Text(action,
                style:
                    const TextStyle(fontSize: 16, fontWeight: FontWeight.bold))
          ])));
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
  final VoidCallback onSignIn;
  const AppFrame(
      {super.key,
      required this.api,
      required this.page,
      required this.onNavigate,
      required this.onSignIn});
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
  final VoidCallback onSignIn;
  final bool closeDrawer;
  const WebsiteSidebar(
      {super.key,
      required this.api,
      required this.page,
      required this.onNavigate,
      required this.onSignIn,
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
                    onNavigate(CustomerPage.home);
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
