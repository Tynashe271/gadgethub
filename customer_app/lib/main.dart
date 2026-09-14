import 'dart:async';
import 'package:flutter/material.dart';

import 'core.dart';
import 'experience.dart';

void main() => runApp(const CustomerApp());

class CustomerApp extends StatefulWidget {
  const CustomerApp({super.key});

  @override
  State<CustomerApp> createState() => _CustomerAppState();
}

class _CustomerAppState extends State<CustomerApp> {
  final api = ApiClient();
  bool ready = false;
  Object? startupError;
  Timer? catalogueRefresh;

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    setState(() {
      ready = false;
      startupError = null;
    });
    try {
      await api.restore();
      await api.loadProducts();
      catalogueRefresh?.cancel();
      catalogueRefresh = Timer.periodic(const Duration(seconds: 15), (_) {
        if (mounted) api.loadProducts('', true).catchError((_) {});
      });
      if (mounted) setState(() => ready = true);
    } catch (error) {
      if (mounted) setState(() => startupError = error);
    }
  }

  @override
  void dispose() {
    catalogueRefresh?.cancel();
    api.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'GadgetHub',
        theme: gadgetTheme(),
        home: ready
            ? CustomerExperience(api: api)
            : Scaffold(
                body: Center(
                  child: startupError == null
                      ? const CircularProgressIndicator()
                      : Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.cloud_off,
                                  size: 52, color: acid),
                              const SizedBox(height: 16),
                              const Text('Could not connect to GadgetHub',
                                  style: TextStyle(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold)),
                              const SizedBox(height: 8),
                              Text('$startupError',
                                  textAlign: TextAlign.center),
                              const SizedBox(height: 20),
                              FilledButton(
                                  onPressed: _initialize,
                                  child: const Text('Try again')),
                            ],
                          ),
                        ),
                ),
              ),
      );
}

class CustomerShell extends StatefulWidget {
  final ApiClient api;
  const CustomerShell({super.key, required this.api});

  @override
  State<CustomerShell> createState() => _CustomerShellState();
}

class _CustomerShellState extends State<CustomerShell> {
  int index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      ShopScreen(api: widget.api),
      OrdersScreen(api: widget.api),
      AccountScreen(api: widget.api)
    ];
    return AnimatedBuilder(
      animation: widget.api,
      builder: (context, child) => Scaffold(
        body: SafeArea(child: pages[index]),
        bottomNavigationBar: NavigationBar(
          selectedIndex: index,
          onDestinationSelected: (value) => setState(() => index = value),
          destinations: const [
            NavigationDestination(
                icon: Icon(Icons.storefront_outlined),
                selectedIcon: Icon(Icons.storefront),
                label: 'Shop'),
            NavigationDestination(
                icon: Icon(Icons.local_shipping_outlined), label: 'Orders'),
            NavigationDestination(
                icon: Icon(Icons.person_outline), label: 'Account'),
          ],
        ),
      ),
    );
  }
}

class ShopScreen extends StatelessWidget {
  final ApiClient api;
  const ShopScreen({super.key, required this.api});

  @override
  Widget build(BuildContext context) => RefreshIndicator(
        onRefresh: api.loadProducts,
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 22, 20, 12),
              sliver: SliverToBoxAdapter(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      const Text('GADGET',
                          style: TextStyle(
                              fontSize: 22, fontWeight: FontWeight.w900)),
                      const Text('HUB',
                          style: TextStyle(
                              fontSize: 22,
                              color: acid,
                              fontWeight: FontWeight.w900)),
                      const Spacer(),
                      IconButton(
                        onPressed: () async {
                          if (!api.signedIn) {
                            return showError(
                                context, ApiError('Please sign in first'));
                          }
                          try {
                            await api.loadCart();
                            if (context.mounted) {
                              await Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                      builder: (_) => CartScreen(api: api)));
                            }
                          } catch (error) {
                            if (context.mounted) showError(context, error);
                          }
                        },
                        icon: Badge(
                            label: Text('${api.cartCount}'),
                            child: const Icon(Icons.shopping_bag_outlined)),
                      ),
                    ]),
                    const SizedBox(height: 28),
                    const Text('Tech that moves\nwith you.',
                        style: TextStyle(
                            fontSize: 38,
                            height: .95,
                            fontWeight: FontWeight.w900)),
                    const SizedBox(height: 12),
                    const Text(
                        'Curated devices. Honest advice. Support that stays.',
                        style: TextStyle(color: Colors.white60)),
                    const SizedBox(height: 22),
                    SearchBar(
                        hintText: 'Search phones, laptops, audio...',
                        leading: const Icon(Icons.search),
                        onSubmitted: api.loadProducts),
                  ],
                ),
              ),
            ),
            if (api.busy)
              const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()))
            else
              SliverPadding(
                padding: const EdgeInsets.all(20),
                sliver: SliverGrid(
                  delegate: SliverChildBuilderDelegate(
                      (_, i) => ProductCard(product: api.products[i], api: api),
                      childCount: api.products.length),
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisExtent: 285,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12),
                ),
              ),
          ],
        ),
      );
}

class CartScreen extends StatelessWidget {
  final ApiClient api;
  const CartScreen({super.key, required this.api});

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
        animation: api,
        builder: (context, child) {
          final items = (api.cart?['items'] as List?) ?? const [];
          return Scaffold(
            appBar: AppBar(title: const Text('Your cart')),
            body: items.isEmpty
                ? const Center(child: Text('Your cart is empty'))
                : ListView.separated(
                    padding: const EdgeInsets.all(20),
                    itemCount: items.length,
                    separatorBuilder: (context, index) => const Divider(),
                    itemBuilder: (_, i) {
                      final item = items[i];
                      final product = item['product'] ?? {};
                      return ListTile(
                        contentPadding: EdgeInsets.zero,
                        leading: const CircleAvatar(
                            backgroundColor: acid,
                            child: Icon(Icons.devices, color: ink)),
                        title: Text('${product['name'] ?? 'Product'}'),
                        subtitle: Text('Quantity ${item['quantity'] ?? 1}'),
                        trailing: IconButton(
                          onPressed: () async {
                            try {
                              await api.removeCartItem('${item['id']}');
                            } catch (error) {
                              if (context.mounted) showError(context, error);
                            }
                          },
                          icon: const Icon(Icons.delete_outline),
                        ),
                      );
                    },
                  ),
          );
        },
      );
}

class ProductCard extends StatelessWidget {
  final Product product;
  final ApiClient api;
  const ProductCard({super.key, required this.product, required this.api});

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: () => showModalBottomSheet(
            context: context,
            isScrollControlled: true,
            builder: (_) => ProductSheet(product: product, api: api)),
        child: Card(
          clipBehavior: Clip.antiAlias,
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
                child: Container(
                    color: const Color(0xFF252A21),
                    width: double.infinity,
                    child: product.image.isEmpty
                        ? const Icon(Icons.devices, size: 68, color: acid)
                        : Image.network(product.image,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                const Icon(Icons.devices,
                                    size: 68, color: acid)))),
            Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(product.brand.toUpperCase(),
                          style: const TextStyle(
                              fontSize: 10, color: acid, letterSpacing: 1)),
                      const SizedBox(height: 5),
                      Text(product.name,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      Text('\$${product.price.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.w900)),
                    ])),
          ]),
        ),
      );
}

class ProductSheet extends StatelessWidget {
  final Product product;
  final ApiClient api;
  const ProductSheet({super.key, required this.product, required this.api});

  @override
  Widget build(BuildContext context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                    height: 180,
                    width: double.infinity,
                    color: const Color(0xFF252A21),
                    child: const Icon(Icons.devices, color: acid, size: 90)),
                const SizedBox(height: 20),
                Text(product.category.toUpperCase(),
                    style: const TextStyle(color: acid, letterSpacing: 2)),
                Text(product.name,
                    style: const TextStyle(
                        fontSize: 28, fontWeight: FontWeight.w900)),
                const SizedBox(height: 8),
                Text(product.description,
                    style: const TextStyle(color: Colors.white60)),
                const SizedBox(height: 18),
                Row(children: [
                  Text('\$${product.price.toStringAsFixed(2)}',
                      style: const TextStyle(
                          fontSize: 25, fontWeight: FontWeight.w900)),
                  const Spacer(),
                  Text('${product.stock} in stock')
                ]),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: () async {
                    try {
                      await api.addToCart(product);
                      if (context.mounted) {
                        Navigator.pop(context);
                        ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Added to cart')));
                      }
                    } catch (error) {
                      if (context.mounted) showError(context, error);
                    }
                  },
                  icon: const Icon(Icons.add_shopping_cart),
                  label: const Text('Add to cart'),
                ),
              ]),
        ),
      );
}

class OrdersScreen extends StatefulWidget {
  final ApiClient api;
  const OrdersScreen({super.key, required this.api});
  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  @override
  void initState() {
    super.initState();
    widget.api.loadOrders();
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Your orders',
              style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          const Text('Track purchases and deliveries.',
              style: TextStyle(color: Colors.white60)),
          const SizedBox(height: 20),
          if (!widget.api.signedIn)
            const Expanded(
                child: Center(child: Text('Sign in to see your orders')))
          else
            Expanded(
                child: RefreshIndicator(
                    onRefresh: widget.api.loadOrders,
                    child: ListView.separated(
                      itemCount: widget.api.orders.length,
                      separatorBuilder: (context, index) => const Divider(),
                      itemBuilder: (_, i) {
                        final order = widget.api.orders[i];
                        return ListTile(
                            contentPadding: EdgeInsets.zero,
                            leading: const CircleAvatar(
                                backgroundColor: acid,
                                child: Icon(Icons.inventory_2_outlined,
                                    color: ink)),
                            title: Text('${order['orderNumber'] ?? 'Order'}'),
                            subtitle: Text('${order['status'] ?? ''}'),
                            trailing: Text('\$${order['total'] ?? '0'}',
                                style: const TextStyle(
                                    fontWeight: FontWeight.bold)));
                      },
                    ))),
        ]),
      );
}

class AccountScreen extends StatefulWidget {
  final ApiClient api;
  const AccountScreen({super.key, required this.api});
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  final email = TextEditingController();
  final password = TextEditingController();

  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (widget.api.signedIn) {
      return Padding(
          padding: const EdgeInsets.all(24),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('My account',
                style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900)),
            const SizedBox(height: 30),
            CircleAvatar(
                radius: 34,
                backgroundColor: acid,
                child: Text('${widget.api.user?['firstName'] ?? 'G'}'[0],
                    style: const TextStyle(color: ink, fontSize: 26))),
            const SizedBox(height: 16),
            Text(
                '${widget.api.user?['firstName']} ${widget.api.user?['lastName']}',
                style:
                    const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
            Text('${widget.api.user?['email']}',
                style: const TextStyle(color: Colors.white60)),
            const Spacer(),
            OutlinedButton.icon(
                onPressed: widget.api.logout,
                icon: const Icon(Icons.logout),
                label: const Text('Sign out')),
          ]));
    }
    return ListView(padding: const EdgeInsets.all(24), children: [
      const SizedBox(height: 30),
      const Text('Welcome back.',
          style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900)),
      const Text('Sign in to shop, save and track your devices.',
          style: TextStyle(color: Colors.white60)),
      const SizedBox(height: 30),
      TextField(
          controller: email,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(labelText: 'Email')),
      const SizedBox(height: 12),
      TextField(
          controller: password,
          obscureText: true,
          decoration: const InputDecoration(labelText: 'Password')),
      const SizedBox(height: 20),
      FilledButton(
          onPressed: () async {
            try {
              await widget.api.login(email.text.trim(), password.text);
            } catch (error) {
              if (context.mounted) showError(context, error);
            }
          },
          child: const Text('Sign in')),
    ]);
  }
}
