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
